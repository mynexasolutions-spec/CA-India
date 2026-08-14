<?php

namespace App\Services\Gst;

use App\Models\ClientGstr2bInvoice;
use App\Models\CommercialDocument;

class GstLiabilityService
{
    /** @return array<string, float|string> */
    public function calculate(int $clientProfileId, string $from, string $to): array
    {
        $output = CommercialDocument::where('client_profile_id', $clientProfileId)
            ->whereBetween('document_date', [$from, $to])
            ->whereIn('status', ['issued', 'paid', 'partial'])
            ->whereIn('type', ['tax_invoice', 'debit_note', 'credit_note'])
            ->selectRaw(
                'COALESCE(SUM(
                    CASE WHEN type = ? THEN -1 ELSE 1 END
                    * (COALESCE(cgst_amount, 0) + COALESCE(sgst_amount, 0) + COALESCE(igst_amount, 0))
                ), 0) AS total_output_gst',
                ['credit_note']
            )
            ->first();

        $eligibleItc = ClientGstr2bInvoice::where('client_profile_id', $clientProfileId)
            ->whereBetween('tax_period', [substr($from, 0, 7), substr($to, 0, 7)])
            ->where('itc_eligibility', 'eligible')
            ->where('match_status', ClientGstr2bInvoice::MATCH_STATUS_MATCHED)
            ->sum('total_gst');

        $totalOutputGst = round((float) ($output?->total_output_gst ?? 0), 2);
        $totalEligibleItc = round((float) $eligibleItc, 2);
        $netLiability = round($totalOutputGst - $totalEligibleItc, 2);
        $result = $netLiability > 0
            ? 'gst_payable'
            : ($netLiability < 0 ? 'excess_itc' : 'no_liability');

        return [
            'total_output_gst' => $totalOutputGst,
            'total_eligible_itc' => $totalEligibleItc,
            'net_gst_liability' => $netLiability,
            'gst_payable' => max($netLiability, 0),
            'itc_carry_forward' => max(-$netLiability, 0),
            'result' => $result,
            'result_label' => match ($result) {
                'gst_payable' => 'GST Payable',
                'excess_itc' => 'Excess ITC Available / ITC Carry Forward',
                default => 'No GST Payable',
            },
        ];
    }

    /** @return array<string, float|int> */
    public function dashboardSummary(int $clientProfileId, string $from, string $to): array
    {
        $liability = $this->calculate($clientProfileId, $from, $to);
        $gstr2b = ClientGstr2bInvoice::where('client_profile_id', $clientProfileId)
            ->whereBetween('tax_period', [substr($from, 0, 7), substr($to, 0, 7)]);

        return [
            'output_gst' => (float) $liability['total_output_gst'],
            'eligible_itc' => (float) $liability['total_eligible_itc'],
            'gst_payable' => (float) $liability['gst_payable'],
            'excess_itc' => (float) $liability['itc_carry_forward'],
            'total_gstr2b_invoices' => (clone $gstr2b)->count(),
            'matched_invoices' => (clone $gstr2b)
                ->where('match_status', ClientGstr2bInvoice::MATCH_STATUS_MATCHED)
                ->count(),
            'unmatched_invoices' => (clone $gstr2b)
                ->where('match_status', ClientGstr2bInvoice::MATCH_STATUS_UNMATCHED)
                ->count(),
        ];
    }
}
