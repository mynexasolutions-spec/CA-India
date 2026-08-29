<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\GstFilingRequest;
use App\Services\Billing\BillingPolicy;
use Illuminate\Http\Request;
use Carbon\Carbon;

/**
 * GST Filing Confirmation — GSTR-1 only (spec §7: "Under Return Type, only GSTR-1
 * should be available. Remove other options and enforce the restriction at backend
 * level."). GSTR-3B has no client-facing confirmation workflow at all.
 *
 * QRMP-aware (spec §5): the accepted filing_period FORMAT depends on the client's
 * resolved GSTR-1 cycle (BillingPolicy::gstr1Frequency()) — "YYYY-MM" for a monthly
 * filer, "YYYY-Qn" for a client on quarterly GSTR-1. A client can't submit the wrong
 * shape for their own profile; this is enforced here, not just hidden in the UI.
 */
class GstFilingController extends Controller
{
    /** Start/end date bounds (YYYY-MM-DD) for a filing period — either a "YYYY-MM"
     * month or a "YYYY-Qn" Indian-FY quarter (Q1 = Apr-Jun … Q4 = Jan-Mar).
     * whereBetween on real date bounds works identically on MySQL and SQLite, unlike a
     * MySQL-only DATE_FORMAT() comparison. */
    private static function periodBounds(string $period): array
    {
        if (preg_match('/^(\d{4})-Q([1-4])$/', $period, $m)) {
            $year = (int) $m[1];
            $ranges = [
                1 => [$year.'-04-01', $year.'-06-30'],
                2 => [$year.'-07-01', $year.'-09-30'],
                3 => [$year.'-10-01', $year.'-12-31'],
                4 => [($year + 1).'-01-01', ($year + 1).'-03-31'],
            ];

            return $ranges[(int) $m[2]];
        }

        $start = Carbon::createFromFormat('Y-m-d', $period.'-01')->startOfMonth();

        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }

    /** Rejects a filing_period whose shape doesn't match this client's actual GSTR-1
     * cycle — a quarterly filer can't submit a bare month and vice versa. */
    private static function assertPeriodMatchesFrequency(ClientProfile $profile, string $period): void
    {
        $quarterly = BillingPolicy::gstr1Frequency($profile) === 'quarterly';
        $isQuarterFormat = (bool) preg_match('/^\d{4}-Q[1-4]$/', $period);
        $isMonthFormat = (bool) preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period);

        abort_if($quarterly && ! $isQuarterFormat, 422, 'Your GSTR-1 is filed quarterly (QRMP) — select a quarter, not a month.');
        abort_if(! $quarterly && ! $isMonthFormat, 422, 'Your GSTR-1 is filed monthly — select a month, not a quarter.');
    }

    public function preview(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'filing_period' => 'required|string', // "YYYY-MM" or "YYYY-Qn" — see assertPeriodMatchesFrequency()
            'return_type' => 'required|string|in:GSTR-1',
        ]);

        $profile = $request->user()->clientProfile;
        $clientProfileId = $profile->id;
        $period = $request->filing_period;
        self::assertPeriodMatchesFrequency($profile, $period);
        [$periodStart, $periodEnd] = self::periodBounds($period);

        // Allowed types for GST calculation
        $types = ['tax_invoice', 'bill_of_supply', 'debit_note', 'credit_note'];

        // GST-period counting spec — a bill belongs to the filing period it was
        // created in, not the period implied by its back-dated Document Date.
        $bills = CommercialDocument::where('client_profile_id', $clientProfileId)
            ->whereIn('type', $types)
            ->whereIn('status', ['issued', 'paid'])
            ->whereDate('created_at', '>=', $periodStart)
            ->whereDate('created_at', '<=', $periodEnd)
            ->get();

        // Net figures = Tax Invoice + Bill of Supply + Debit Note − Credit Note.
        $taxableValue = 0;
        $cgst = 0;
        $sgst = 0;
        $igst = 0;

        foreach ($bills as $bill) {
            $sign = $bill->type === 'credit_note' ? -1 : 1;
            $taxableValue += $sign * $bill->taxable_amount;
            $cgst += $sign * $bill->cgst_amount;
            $sgst += $sign * $bill->sgst_amount;
            $igst += $sign * $bill->igst_amount;
        }

        $totalGst = $cgst + $sgst + $igst;

        return response()->json([
            'bills' => $bills,
            'summary' => [
                'total_bills' => $bills->count(),
                'taxable_value' => $taxableValue,
                'total_cgst' => $cgst,
                'total_sgst' => $sgst,
                'total_igst' => $igst,
                'total_gst' => $totalGst,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'filing_period' => 'required|string', // "YYYY-MM" or "YYYY-Qn" — see assertPeriodMatchesFrequency()
            'return_type' => 'required|string|in:GSTR-1',
            'client_declaration' => 'required|accepted',
        ]);

        $profile = $request->user()->clientProfile;
        $clientProfileId = $profile->id;
        self::assertPeriodMatchesFrequency($profile, $request->filing_period);

        // Check if there's already an active request for this period
        $existing = GstFilingRequest::where('client_profile_id', $clientProfileId)
            ->where('filing_period', $request->filing_period)
            ->whereNotIn('status', ['Correction Required']) // Allow new one if old was correction required? Or just block if Pending/Approved
            ->first();
            
        if ($existing && in_array($existing->status, ['Pending CA Review', 'Approved for Filing', 'GST Filed'])) {
            return response()->json(['message' => 'A GST Filing request for this period is already in progress or completed.'], 400);
        }

        // Fetch bills again
        $period = $request->filing_period;
        $types = ['tax_invoice', 'bill_of_supply', 'debit_note', 'credit_note'];
        [$periodStart, $periodEnd] = self::periodBounds($period);

        // GST-period counting spec — a bill belongs to the filing period it was
        // created in, not the period implied by its back-dated Document Date.
        $bills = CommercialDocument::where('client_profile_id', $clientProfileId)
            ->whereIn('type', $types)
            ->whereIn('status', ['issued', 'paid'])
            ->whereDate('created_at', '>=', $periodStart)
            ->whereDate('created_at', '<=', $periodEnd)
            ->get();

        // Net figures = Tax Invoice + Bill of Supply + Debit Note − Credit Note.
        $taxableValue = 0;
        $cgst = 0;
        $sgst = 0;
        $igst = 0;
        foreach ($bills as $bill) {
            $sign = $bill->type === 'credit_note' ? -1 : 1;
            $taxableValue += $sign * $bill->taxable_amount;
            $cgst += $sign * $bill->cgst_amount;
            $sgst += $sign * $bill->sgst_amount;
            $igst += $sign * $bill->igst_amount;
        }
        $totalGst = $cgst + $sgst + $igst;

        $filingRequest = GstFilingRequest::create([
            'client_profile_id' => $clientProfileId,
            'financial_year' => $request->financial_year,
            'filing_period' => $request->filing_period,
            'return_type' => $request->return_type,
            'status' => 'Pending CA Review',
            'total_bills' => $bills->count(),
            'taxable_value' => $taxableValue,
            'total_cgst' => $cgst,
            'total_sgst' => $sgst,
            'total_igst' => $igst,
            'total_gst' => $totalGst,
            'client_declaration' => $request->client_declaration,
        ]);

        // Attach documents to pivot table
        $filingRequest->documents()->attach($bills->pluck('id'));

        return response()->json([
            'message' => 'GST filing confirmation has been sent to CA for review and filing process.',
            'request' => $filingRequest
        ]);
    }

    public function index(Request $request)
    {
        $requests = GstFilingRequest::where('client_profile_id', $request->user()->clientProfile->id)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($requests);
    }

    public function show(Request $request, $id)
    {
        $filingRequest = GstFilingRequest::with('documents')->where('client_profile_id', $request->user()->clientProfile->id)->findOrFail($id);
        
        return response()->json($filingRequest);
    }
}
