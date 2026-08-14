<?php

namespace App\Http\Controllers\Api\Billing;

use App\Http\Controllers\Controller;
use App\Models\CommercialDocument;
use App\Models\Customer;
use App\Services\Billing\BillingPolicy;
use App\Services\Gst\GstLiabilityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(private readonly GstLiabilityService $liabilityService) {}

    private function profile(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 403, 'No billing profile');

        return $profile;
    }

    /** Indian FY: 1 Apr – 31 Mar. Switches automatically on 1 April. */
    private function currentFyRange(): array
    {
        $now = now();
        $y1 = $now->month >= 4 ? $now->year : $now->year - 1;

        return ["{$y1}-04-01", ($y1 + 1).'-03-31'];
    }

    private function applyPeriod(Builder $q, ?string $from, ?string $to): Builder
    {
        if ($from) {
            $q->whereDate('document_date', '>=', $from);
        }
        if ($to) {
            $q->whereDate('document_date', '<=', $to);
        }

        return $q;
    }

    public function index(Request $request)
    {
        $profile = $this->profile($request);
        $pid = $profile->id;
        [$defaultFrom, $defaultTo] = $this->currentFyRange();
        $from = $request->input('from', $defaultFrom);
        $to = $request->input('to', $defaultTo);

        $base = CommercialDocument::where('client_profile_id', $pid)->where('status', '!=', 'cancelled');
        $this->applyPeriod($base, $from, $to);

        $tax = (clone $base)->where('type', 'tax_invoice')->where('status', 'issued');
        $bos = (clone $base)->where('type', 'bill_of_supply')->where('status', 'issued');
        $dn = (clone $base)->where('type', 'debit_note');
        $cn = (clone $base)->where('type', 'credit_note');
        $cancelled = CommercialDocument::where('client_profile_id', $pid)->where('status', 'cancelled');
        $this->applyPeriod($cancelled, $from, $to);

        $gstBucket = function (Builder $q): array {
            $scope = (clone $q)->where('status', 'issued');

            return [
                'taxable_value' => (float) (clone $scope)->sum('taxable_amount'),
                'cgst' => (float) (clone $scope)->sum('cgst_amount'),
                'sgst' => (float) (clone $scope)->sum('sgst_amount'),
                'igst' => (float) (clone $scope)->sum('igst_amount'),
                'total_invoice_value' => (float) (clone $scope)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
            ];
        };

        $zero = [
            'taxable_value' => 0.0,
            'cgst' => 0.0,
            'sgst' => 0.0,
            'igst' => 0.0,
            'total_invoice_value' => 0.0,
        ];

        $gstTax = $gstBucket($tax);
        $gstBos = $gstBucket($bos);
        $gstDn = $gstBucket($dn);
        $gstCn = $gstBucket($cn);

        $mode = BillingPolicy::mode($profile);
        if ($mode === 'regular') {
            $gstBos = $zero;
        } elseif ($mode === 'composition') {
            $gstTax = $zero;
            $gstDn = $zero;
        }

        $recent = CommercialDocument::where('client_profile_id', $pid);
        $this->applyPeriod($recent, $from, $to);
        $recent = $recent
            ->with('customer:id,name')
            ->latest('document_date')
            ->latest('id')
            ->limit(8)
            ->get();

        return response()->json([
            'period' => ['from' => $from, 'to' => $to],
            'summary' => [
                'total_invoices' => (clone $base)->whereIn('type', ['tax_invoice', 'bill_of_supply', 'debit_note', 'credit_note'])->where('status', 'issued')->count(),
                'tax_invoices' => (clone $tax)->count(),
                'tax_invoices_value' => (float) (clone $tax)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
                'bill_of_supply' => (clone $bos)->count(),
                'bill_of_supply_value' => (float) (clone $bos)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
                'debit_notes' => (clone $dn)->where('status', 'issued')->count(),
                'debit_notes_value' => (float) (clone $dn)->where('status', 'issued')->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
                'credit_notes' => (clone $cn)->where('status', 'issued')->count(),
                'credit_notes_value' => (float) (clone $cn)->where('status', 'issued')->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
                'cancelled_invoices' => (clone $cancelled)->count(),
            ],
            'gst' => [
                'taxable_value' => $gstTax['taxable_value'],
                'cgst' => $gstTax['cgst'],
                'sgst' => $gstTax['sgst'],
                'igst' => $gstTax['igst'],
                'total_gst' => $gstTax['cgst'] + $gstTax['sgst'] + $gstTax['igst'],
                'total_invoice_value' => $gstTax['total_invoice_value'],
            ],
            'gst_matrix' => [
                'tax_invoice' => $gstTax,
                'bill_of_supply' => $gstBos,
                'debit_note' => $gstDn,
                'credit_note' => $gstCn,
            ],
            'dealer_mode' => $mode,
            'gst_dashboard' => $mode === 'regular'
                ? $this->liabilityService->dashboardSummary($pid, $from, $to)
                : null,
            'monthly_trend' => [],
            'recent_invoices' => $recent,
            'parties_count' => Customer::where('client_profile_id', $pid)->count(),
        ]);
    }
}
