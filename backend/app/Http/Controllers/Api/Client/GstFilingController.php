<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\GstFilingRequest;
use App\Services\Billing\BillingPolicy;
use App\Services\Gst\Gstr2bReconciliationService;
use Illuminate\Http\Request;
use Carbon\Carbon;

/**
 * GST Filing Confirmation — GSTR-1 (spec §7 of the original Billing guide) and GSTR-3B
 * (client-portal "GST Returns" spec: GSTR-1 and GSTR-3B as tabs of one GST Returns
 * module). GSTR-3B carries one extra rule GSTR-1 does not: a filing request may not be
 * created for a period whose GSTR-2B reconciliation is still pending — see
 * assertReconciliationComplete() and Gstr2bReconciliationService, which derive
 * reconciliation status from ClientGstr2bRecord/ClientGstr2bInvoice.match_status (no
 * explicit status column exists). For a quarterly/QRMP GSTR-3B period, "reconciled"
 * means every one of the 3 underlying calendar months is reconciled — GSTR-2B is never
 * treated as one quarterly statement.
 *
 * QRMP-aware (spec §5): the accepted filing_period FORMAT depends on the client's
 * resolved cycle for the given return_type (BillingPolicy::gstr1Frequency() /
 * gstr3bFrequency()) — "YYYY-MM" for a monthly filer, "YYYY-Qn" for a quarterly one. A
 * client can't submit the wrong shape for their own profile; this is enforced here, not
 * just hidden in the UI.
 */
class GstFilingController extends Controller
{
    /** Start/end date bounds (YYYY-MM-DD) for a filing period — a "YYYY-MM" month, a
     * "YYYY-Qn" Indian-FY quarter (Q1 = Apr-Jun … Q4 = Jan-Mar), or a bare "YYYY" FY
     * start year (GSTR-4's Annual period: Apr 1 that year -> Mar 31 the next).
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

        if (preg_match('/^(\d{4})$/', $period, $m)) {
            $year = (int) $m[1];

            return [$year.'-04-01', ($year + 1).'-03-31'];
        }

        $start = Carbon::createFromFormat('Y-m-d', $period.'-01')->startOfMonth();

        return [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()];
    }

    /** Rejects a filing_period whose shape doesn't match this client's actual cycle for
     * the given return_type — a quarterly filer can't submit a bare month and vice versa.
     * $returnType defaults to 'GSTR-1' so the original (unmodified) GSTR-1 branch below
     * still runs exactly as before for any existing caller that doesn't pass it. */
    private static function assertPeriodMatchesFrequency(ClientProfile $profile, string $period, string $returnType = 'GSTR-1'): void
    {
        if ($returnType === 'GSTR-3B') {
            // GST Filing Return Type & Period Logic spec: GSTR-3B's period shape follows
            // the client's GSTR-2B frequency (not a separate gstr3bFrequency reading) —
            // GSTR-2B Monthly -> GSTR-3B Monthly, GSTR-2B Quarterly -> GSTR-3B Quarterly.
            $quarterly = BillingPolicy::gstr2bFrequency($profile) === 'quarterly';
            $isQuarterFormat = (bool) preg_match('/^\d{4}-Q[1-4]$/', $period);
            $isMonthFormat = (bool) preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period);

            abort_if($quarterly && ! $isQuarterFormat, 422, 'Your GSTR-3B is filed quarterly — select a quarter, not a month.');
            abort_if(! $quarterly && ! $isMonthFormat, 422, 'Your GSTR-3B is filed monthly — select a month, not a quarter.');

            return;
        }

        // Composition — CMP-08: no GSTR-2B applicability, always quarterly, no dependence
        // on any monthly/quarterly profile setting.
        if ($returnType === 'CMP-08') {
            abort_unless((bool) preg_match('/^\d{4}-Q[1-4]$/', $period), 422, 'CMP-08 is filed quarterly — select a quarter.');

            return;
        }

        // Composition — GSTR-4: Annual, one period per Financial Year (a bare "YYYY"
        // FY start year), never a month or quarter.
        if ($returnType === 'GSTR-4') {
            abort_unless((bool) preg_match('/^\d{4}$/', $period), 422, 'GSTR-4 is filed annually — select a financial year.');

            return;
        }

        // GST Filing Return Type & Period Logic spec: GSTR-1's Filing Period is always
        // Monthly — even a QRMP (quarterly GSTR-3B) dealer still tracks GSTR-1 monthly
        // via IFF, so gstr1_filing_frequency is no longer consulted here.
        $isMonthFormat = (bool) preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period);
        abort_if(! $isMonthFormat, 422, 'GSTR-1 is filed monthly — select a month, not a quarter.');
    }

    /** GSTR-3B mandatory reconciliation gate (client-portal GST Returns spec §6) — a
     * no-op for GSTR-1 (first line), so this can never affect the existing GSTR-1
     * store() path. For GSTR-3B, blocks creating the filing request outright when the
     * applicable GSTR-2B period(s) aren't fully reconciled yet. */
    private static function assertReconciliationComplete(int $clientProfileId, string $returnType, string $period): void
    {
        if ($returnType !== 'GSTR-3B') {
            return;
        }

        abort_unless(
            Gstr2bReconciliationService::isPeriodReconciled($clientProfileId, $period),
            422,
            'GSTR reconciliation is pending for the selected period. Please complete GSTR-2B reconciliation before raising the GSTR-3B filing request.'
        );
    }

    public function preview(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'filing_period' => 'required|string', // "YYYY-MM" or "YYYY-Qn" — see assertPeriodMatchesFrequency()
            'return_type' => 'required|string|in:GSTR-1,GSTR-3B,CMP-08,GSTR-4',
        ]);

        $profile = $request->user()->clientProfile;
        $clientProfileId = $profile->id;
        $period = $request->filing_period;
        $returnType = $request->return_type;
        self::assertPeriodMatchesFrequency($profile, $period, $returnType);
        [$periodStart, $periodEnd] = self::periodBounds($period);

        // Informational only (never blocks preview) — the frontend uses this to decide
        // whether the "Send Filing Request" action is enabled, and store() enforces the
        // actual block. Null for GSTR-1, which has no reconciliation gate.
        $reconciliationStatus = $returnType === 'GSTR-3B'
            ? (Gstr2bReconciliationService::isPeriodReconciled($clientProfileId, $period) ? 'completed' : 'pending')
            : null;

        // Allowed types for GST calculation
        $types = ['tax_invoice', 'bill_of_supply', 'debit_note', 'credit_note'];

        // GST-period counting spec — a bill belongs to the filing period it was
        // created in, not the period implied by its back-dated Document Date.
        $bills = CommercialDocument::where('client_profile_id', $clientProfileId)
            ->whereIn('type', $types)
            ->whereIn('status', ['issued', 'paid', 'partial'])
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
            ],
            'reconciliation_status' => $reconciliationStatus,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'filing_period' => 'required|string', // "YYYY-MM" or "YYYY-Qn" — see assertPeriodMatchesFrequency()
            'return_type' => 'required|string|in:GSTR-1,GSTR-3B,CMP-08,GSTR-4',
            'client_declaration' => 'required|accepted',
        ]);

        $profile = $request->user()->clientProfile;
        $clientProfileId = $profile->id;
        self::assertPeriodMatchesFrequency($profile, $request->filing_period, $request->return_type);
        self::assertReconciliationComplete($clientProfileId, $request->return_type, $request->filing_period);

        // Check if there's already an active request for this period + return type — scoped
        // to return_type too, since GSTR-1 and GSTR-3B (or CMP-08 and GSTR-3B's own quarter
        // periods) can share the exact same period string without being the same request.
        $existing = GstFilingRequest::where('client_profile_id', $clientProfileId)
            ->where('filing_period', $request->filing_period)
            ->where('return_type', $request->return_type)
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
            ->whereIn('status', ['issued', 'paid', 'partial'])
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

    /**
     * Data source for the client GST Returns workspace's "Filing Periods" table (one
     * tab each for GSTR-1 and GSTR-3B). Builds the FY period grid via
     * Gstr2bReconciliationService::periodGrid() (deliberately independent of
     * GstReturnController::buildPeriods() — see that service's docblock), joins in this
     * client's own GstFilingRequest per period, and — for GSTR-3B only — attaches
     * reconciliation status so the frontend can render the "Reconciliation Pending" /
     * "View Reconciliation" state without a second round trip.
     */
    public function periods(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'return_type' => 'required|string|in:GSTR-1,GSTR-3B,CMP-08,GSTR-4',
        ]);

        $profile = $request->user()->clientProfile;
        $clientProfileId = $profile->id;
        $returnType = $request->return_type;

        abort_unless(preg_match('/^(\d{4})-/', $request->financial_year, $m), 422, 'Invalid financial_year.');
        $startYear = (int) $m[1];

        // GST Filing Return Type & Period Logic spec: GSTR-3B's cadence follows the
        // client's GSTR-2B frequency; GSTR-1 is always Monthly (tracked via IFF under
        // QRMP), so it never becomes quarterly here regardless of gstr1_filing_frequency.
        // CMP-08 is always Quarterly regardless of any profile setting (no GSTR-2B
        // applicability at all); GSTR-4 is Annual — periodGrid() ignores $quarterly for it.
        $gstr2bQuarterly = BillingPolicy::gstr2bFrequency($profile) === 'quarterly';
        $quarterly = match ($returnType) {
            'GSTR-3B' => $gstr2bQuarterly,
            'CMP-08' => true,
            default => false,
        };
        // GSTR-1 tracked monthly via IFF while the client's overall (GSTR-2B/3B) cadence
        // is quarterly — same QRMP due-date distinction as GstReturnController::buildPeriods().
        $qrmpMonthlyGstr1 = $returnType === 'GSTR-1' && $gstr2bQuarterly;

        $grid = Gstr2bReconciliationService::periodGrid($returnType, $quarterly, $startYear, $qrmpMonthlyGstr1);

        $existingRequests = GstFilingRequest::where('client_profile_id', $clientProfileId)
            ->where('return_type', $returnType)
            ->get()
            ->keyBy('filing_period');

        $periods = array_map(function (array $p) use ($existingRequests, $returnType, $clientProfileId, $quarterly) {
            $existing = $existingRequests->get($p['period']);

            $reconciliationStatus = null;
            $reconciliationBreakdown = null;
            if ($returnType === 'GSTR-3B') {
                $reconciliationStatus = Gstr2bReconciliationService::isPeriodReconciled($clientProfileId, $p['period'])
                    ? 'completed'
                    : 'pending';
                if ($quarterly) {
                    $reconciliationBreakdown = Gstr2bReconciliationService::quarterMonthBreakdown($clientProfileId, $p['period']);
                }
            }

            [$status, $action] = self::resolvePeriodStatusAndAction($existing, $returnType, $reconciliationStatus);

            return [
                'period' => $p['period'],
                'period_label' => $p['period_label'],
                'due_date' => $p['due_date'],
                'status' => $status,
                'filed_on' => $existing?->filing_date,
                'ack_no' => $existing?->ack_no,
                'filing_request_id' => $existing?->id,
                'reconciliation_status' => $reconciliationStatus,
                'reconciliation_month_breakdown' => $reconciliationBreakdown,
                'action' => $action,
            ];
        }, $grid);

        return response()->json([
            'financial_year' => $request->financial_year,
            'return_type' => $returnType,
            'quarterly' => $quarterly,
            'summary' => self::periodsSummary($profile, $returnType, $quarterly, $gstr2bQuarterly, $existingRequests, $periods),
            'periods' => $periods,
        ]);
    }

    /** Per-return-type summary cards (Dealer Type / Filing Frequency / Last Filed
     * Return / Next Due Date) for the GST Returns workspace header — computed here
     * rather than reusing GstReturnController::index() (whose "next_due"/frequency
     * label are combined across GSTR-1+GSTR-3B, not split per tab as the spec's two
     * reference screenshots require), again to avoid touching that controller. */
    private static function periodsSummary(ClientProfile $profile, string $returnType, bool $quarterly, bool $gstr2bQuarterly, $existingRequests, array $periods): array
    {
        $frequencyLabel = match ($returnType) {
            'GSTR-3B' => $quarterly ? 'Quarterly' : 'Monthly',
            'CMP-08' => 'Quarterly',
            'GSTR-4' => 'Annual',
            // GSTR-1 is always Monthly — "Monthly (QRMP)" only changes the label when
            // tracked via IFF while the overall (GSTR-2B/3B) cadence is quarterly.
            default => $gstr2bQuarterly ? 'Monthly (QRMP)' : 'Monthly',
        };

        $lastFiledRequest = $existingRequests->where('status', 'GST Filed')
            ->sortByDesc(fn ($r) => $r->filing_date ?? $r->filing_period)
            ->first();

        $nextDuePeriod = collect($periods)->first(fn ($p) => $p['status'] !== 'Filed Successfully');

        return [
            'dealer_type' => $profile->dealer_type,
            'filing_frequency_label' => $frequencyLabel,
            'last_filed' => $lastFiledRequest ? [
                'period' => $lastFiledRequest->filing_period,
                'filed_on' => $lastFiledRequest->filing_date,
            ] : null,
            'next_due' => $nextDuePeriod ? [
                'period' => $nextDuePeriod['period'],
                'period_label' => $nextDuePeriod['period_label'],
                'date' => $nextDuePeriod['due_date'],
            ] : null,
        ];
    }

    /** Row status label + action ('request_filing' | 'view_details' | 'view_reconciliation')
     * for one Filing Periods table row. An existing request always wins (mirrors store()'s
     * own uniqueness check — a 'Correction Required' request re-enables Request Filing,
     * matching store()'s `whereNotIn('status', ['Correction Required'])` allowance);
     * otherwise a GSTR-3B period with pending reconciliation routes to View Reconciliation. */
    private static function resolvePeriodStatusAndAction(?GstFilingRequest $existing, string $returnType, ?string $reconciliationStatus): array
    {
        if ($existing) {
            return match ($existing->status) {
                'GST Filed' => ['Filed Successfully', 'view_details'],
                'Correction Required' => ['Correction Required', 'request_filing'],
                default => [$existing->status, 'view_details'],
            };
        }

        if ($returnType === 'GSTR-3B' && $reconciliationStatus === 'pending') {
            return ['Reconciliation Pending', 'view_reconciliation'];
        }

        return ['Request Not Raised', 'request_filing'];
    }
}
