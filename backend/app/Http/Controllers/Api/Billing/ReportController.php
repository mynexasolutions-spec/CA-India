<?php

namespace App\Http\Controllers\Api\Billing;

use App\Http\Controllers\Controller;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Services\Billing\BillingPolicy;
use App\Services\Gst\GstLiabilityService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(private readonly GstLiabilityService $liabilityService) {}

    private function profileId(Request $request): int
    {
        abort_unless($request->user()->clientProfile, 403);

        return $request->user()->clientProfile->id;
    }

    private function dateRange(Request $request): array
    {
        $openEnded = in_array($request->input('type'), ['outstanding_report', 'outstanding', 'pending_dues', 'paid_invoices'], true)
            && ! $request->filled('from') && ! $request->filled('to');

        if ($openEnded) {
            return ['1970-01-01', '2999-12-31'];
        }

        $now = now();
        $y1 = $now->month >= 4 ? $now->year : $now->year - 1;
        $fyFrom = "{$y1}-04-01";
        $fyTo = ($y1 + 1).'-03-31';

        return [
            $request->input('from', $fyFrom),
            $request->input('to', $fyTo),
        ];
    }

    public function index(Request $request)
    {
        $type = $request->input('type', 'gst_summary');
        $pid = $this->profileId($request);
        $period = $type === 'gst_liability'
            ? $this->liabilityPeriod($request)
            : array_combine(['from', 'to'], $this->dateRange($request));
        $data = $this->build($type, $pid, $period['from'], $period['to']);

        return response()->json([
            'type' => $type,
            ...$period,
            'data' => $data,
            'available' => $this->availableTypes(),
        ]);
    }

    public function export(Request $request)
    {
        $format = $request->input('format', 'csv');
        $type = $request->input('type', 'gst_summary');
        $pid = $this->profileId($request);
        $period = $type === 'gst_liability'
            ? $this->liabilityPeriod($request)
            : array_combine(['from', 'to'], $this->dateRange($request));
        $data = $this->build($type, $pid, $period['from'], $period['to']);
        $rows = $this->flattenRows($data);

        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.report', [
                'title' => strtoupper(str_replace('_', ' ', $type)),
                'from' => $period['from'],
                'to' => $period['to'],
                'periodLabel' => $period['period_label'] ?? null,
                'rows' => $rows,
            ]);

            return $pdf->download("{$type}.pdf");
        }

        if ($format === 'xlsx') {
            // Simple XML SpreadsheetML (Excel-openable) without heavy writer dependency usage
            return $this->xlsxDownload($type, $rows);
        }

        return $this->csvDownload($type, $rows);
    }

    /** Back-compat */
    public function exportCsv(Request $request): StreamedResponse
    {
        $request->merge(['format' => 'csv']);

        return $this->export($request);
    }

    /** @return array{period_type: string, financial_year: string, period_label: string, from: string, to: string} */
    private function liabilityPeriod(Request $request): array
    {
        $data = $request->validate([
            'period_type' => 'required|in:month,quarter,financial_year',
            'financial_year' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'month' => ['nullable', 'required_if:period_type,month', 'regex:/^\d{4}-\d{2}$/'],
            'quarter' => 'nullable|required_if:period_type,quarter|in:Q1,Q2,Q3,Q4',
        ]);

        $financialYear = $data['financial_year'];
        $startYear = (int) substr($financialYear, 0, 4);
        $expectedFinancialYear = $startYear.'-'.substr((string) ($startYear + 1), -2);
        abort_unless($financialYear === $expectedFinancialYear, 422, 'Invalid financial year.');

        if ($data['period_type'] === 'month') {
            $month = $data['month'];
            $firstMonth = $startYear.'-04';
            $lastMonth = ($startYear + 1).'-03';
            $monthStart = \DateTimeImmutable::createFromFormat('!Y-m-d', $month.'-01');
            abort_unless(
                $monthStart && $monthStart->format('Y-m') === $month,
                422,
                'Invalid month.'
            );
            abort_unless(
                $month >= $firstMonth && $month <= $lastMonth,
                422,
                'The selected month is outside the financial year.'
            );

            return [
                'period_type' => 'month',
                'financial_year' => $financialYear,
                'period_label' => $monthStart->format('F Y'),
                'from' => $monthStart->format('Y-m-d'),
                'to' => $monthStart->modify('last day of this month')->format('Y-m-d'),
            ];
        }

        if ($data['period_type'] === 'quarter') {
            $quarter = $data['quarter'];
            $ranges = [
                'Q1' => [$startYear.'-04-01', $startYear.'-06-30', 'April–June'],
                'Q2' => [$startYear.'-07-01', $startYear.'-09-30', 'July–September'],
                'Q3' => [$startYear.'-10-01', $startYear.'-12-31', 'October–December'],
                'Q4' => [($startYear + 1).'-01-01', ($startYear + 1).'-03-31', 'January–March'],
            ];
            [$from, $to, $months] = $ranges[$quarter];

            return [
                'period_type' => 'quarter',
                'financial_year' => $financialYear,
                'period_label' => "{$quarter} {$financialYear} ({$months})",
                'from' => $from,
                'to' => $to,
            ];
        }

        return [
            'period_type' => 'financial_year',
            'financial_year' => $financialYear,
            'period_label' => 'FY '.$financialYear,
            'from' => $startYear.'-04-01',
            'to' => ($startYear + 1).'-03-31',
        ];
    }

    private function build(string $type, int $pid, string $from, string $to)
    {
        $base = CommercialDocument::where('client_profile_id', $pid)
            ->whereBetween('document_date', [$from, $to]);

        return match ($type) {
            'sales_register', 'sales_summary' => (clone $base)->where('type', 'tax_invoice')->where('status', 'issued')
                ->with('customer:id,name')->orderBy('document_date')->get(),
            'invoice_register', 'document_register' => (clone $base)->with('customer:id,name')->orderBy('document_date')->get(),
            'gst_summary' => $this->gstSummaryMatrix($base, $pid),
            'gst_liability' => $this->gstLiability($pid, $from, $to),
            'hsn_summary', 'hsn_wise' => DB::table('document_line_items as li')
                ->join('commercial_documents as d', 'd.id', '=', 'li.commercial_document_id')
                ->where('d.client_profile_id', $pid)
                ->whereBetween('d.document_date', [$from, $to])
                ->where('d.type', 'tax_invoice')
                ->where('d.status', 'issued')
                ->select(
                    'li.hsn_sac',
                    DB::raw('MAX(li.description) as description'),
                    DB::raw('SUM(li.qty) as qty'),
                    DB::raw('SUM(li.taxable_amount) as taxable'),
                    DB::raw('AVG(li.gst_rate) as gst_rate'),
                    DB::raw('SUM(li.cgst_amount) as cgst'),
                    DB::raw('SUM(li.sgst_amount) as sgst'),
                    DB::raw('SUM(li.igst_amount) as igst'),
                    DB::raw('SUM(li.total_amount) as total')
                )
                ->groupBy('li.hsn_sac')->get(),
            'party_wise', 'customer_wise', 'party_wise_sales' => (clone $base)
                ->whereIn('type', ['tax_invoice', 'bill_of_supply', 'debit_note', 'credit_note'])
                ->where('status', 'issued')
                ->select('customer_id', DB::raw('COUNT(*) as invoices'), DB::raw('SUM(taxable_amount) as taxable'), DB::raw('SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total'))
                ->groupBy('customer_id')->with('customer:id,name')->get(),
            'monthly_sales' => (clone $base)->where('type', 'tax_invoice')->where('status', 'issued')
                ->selectRaw('DATE_FORMAT(document_date, "%Y-%m") as month, COUNT(*) as count, SUM(taxable_amount) as taxable, SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total')
                ->groupBy('month')->orderBy('month')->get(),
            'outstanding', 'pending_dues', 'outstanding_report' => (clone $base)
                ->whereIn('type', ['tax_invoice', 'bill_of_supply'])
                ->whereIn('status', ['issued', 'partial'])
                ->with('customer:id,name')
                ->orderBy('document_date')
                ->get(),
            'paid_invoices' => (clone $base)
                ->whereIn('type', ['tax_invoice', 'bill_of_supply'])
                ->where('status', 'paid')
                ->with('customer:id,name')
                ->orderByDesc('document_date')
                ->get(),
            'credit_notes' => (clone $base)->where('type', 'credit_note')->with('customer:id,name')->get(),
            'debit_notes' => (clone $base)->where('type', 'debit_note')->with('customer:id,name')->get(),
            default => ['error' => 'Unknown report type', 'available' => $this->availableTypes()],
        };
    }

    /** @return array<string, float|string> */
    private function gstLiability(int $pid, string $from, string $to): array
    {
        $profile = ClientProfile::find($pid);
        abort_unless(
            $profile && BillingPolicy::mode($profile) === 'regular',
            422,
            'GST Liability Report is available only for regular GST dealers.'
        );

        return $this->liabilityService->calculate($pid, $from, $to);
    }

    private function gstSummaryMatrix($base, int $pid): array
    {
        $bucket = function (string $type) use ($base): array {
            $scope = (clone $base)->where('type', $type)->where('status', 'issued');

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

        $tax = $bucket('tax_invoice');
        $bos = $bucket('bill_of_supply');
        $dn = $bucket('debit_note');
        $cn = $bucket('credit_note');

        $profile = ClientProfile::find($pid);
        $mode = $profile ? BillingPolicy::mode($profile) : 'regular';

        // Same 4-column structure for every dealer type — only values change.
        if ($mode === 'regular') {
            $bos = $zero;
        } elseif ($mode === 'composition') {
            $tax = $zero;
            $dn = $zero;
        }

        return [
            'matrix' => [
                'tax_invoice' => $tax,
                'bill_of_supply' => $bos,
                'debit_note' => $dn,
                'credit_note' => $cn,
            ],
            'dealer_mode' => $mode,
            // Legacy flat fields
            'taxable' => $tax['taxable_value'],
            'cgst' => $tax['cgst'],
            'sgst' => $tax['sgst'],
            'igst' => $tax['igst'],
            'total_gst' => $tax['cgst'] + $tax['sgst'] + $tax['igst'],
            'total' => $tax['total_invoice_value'],
        ];
    }

    private function flattenGstMatrix(array $matrix): array
    {
        $rows = [
            'taxable_value' => 'Total Taxable Value',
            'cgst' => 'CGST Amount',
            'sgst' => 'SGST/UTGST Amount',
            'igst' => 'IGST Amount',
            'total_invoice_value' => 'Total Gross Value',
        ];
        $out = [];
        foreach ($rows as $key => $label) {
            $out[] = [
                'Particulars' => $label,
                'Tax Invoices' => (float) ($matrix['tax_invoice'][$key] ?? 0),
                'Bill of Supply' => (float) ($matrix['bill_of_supply'][$key] ?? 0),
                'Debit Notes' => (float) ($matrix['debit_note'][$key] ?? 0),
                'Credit Notes' => (float) ($matrix['credit_note'][$key] ?? 0),
            ];
        }

        return $out;
    }

    private function availableTypes(): array
    {
        return [
            'sales_register', 'invoice_register', 'gst_summary', 'gst_liability', 'hsn_summary',
            'party_wise_sales', 'monthly_sales', 'outstanding_report', 'paid_invoices',
            'credit_notes', 'debit_notes',
        ];
    }

    private function flattenRows($data): array
    {
        if (is_object($data) && method_exists($data, 'toArray')) {
            $data = $data->toArray();
        }
        if (! is_array($data)) {
            return [['value' => $data]];
        }
        if (isset($data['matrix']) && is_array($data['matrix'])) {
            return $this->flattenGstMatrix($data['matrix']);
        }
        if (isset($data['total_output_gst'], $data['total_eligible_itc'])) {
            return [
                ['Particulars' => 'Total Output GST', 'Amount' => $data['total_output_gst']],
                ['Particulars' => 'Total Eligible ITC', 'Amount' => $data['total_eligible_itc']],
                ['Particulars' => 'Net GST Liability (Output GST - Eligible ITC)', 'Amount' => $data['net_gst_liability']],
                ['Particulars' => 'GST Payable', 'Amount' => $data['gst_payable']],
                ['Particulars' => 'ITC Carry Forward', 'Amount' => $data['itc_carry_forward']],
                ['Particulars' => 'Result', 'Amount' => $data['result_label']],
            ];
        }
        if (isset($data['taxable']) || isset($data['error'])) {
            return [$data];
        }
        $out = [];
        foreach ($data as $row) {
            $arr = is_array($row) ? $row : (array) $row;
            if (isset($arr['customer']) && is_array($arr['customer'])) {
                $arr['party_name'] = $arr['customer']['name'] ?? '';
                unset($arr['customer']);
            }
            $out[] = $arr;
        }

        return $out ?: [['message' => 'No data']];
    }

    private function csvDownload(string $type, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            $first = $rows[0] ?? [];
            if ($first) {
                fputcsv($out, array_keys($first));
            }
            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($v) => is_scalar($v) || $v === null ? $v : json_encode($v), $row));
            }
            fclose($out);
        }, "{$type}.csv", ['Content-Type' => 'text/csv']);
    }

    private function xlsxDownload(string $type, array $rows)
    {
        $headers = array_keys($rows[0] ?? ['value' => '']);
        $xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>';
        $xml .= '<Row>';
        foreach ($headers as $h) {
            $xml .= '<Cell><Data ss:Type="String">'.htmlspecialchars((string) $h).'</Data></Cell>';
        }
        $xml .= '</Row>';
        foreach ($rows as $row) {
            $xml .= '<Row>';
            foreach ($headers as $h) {
                $v = $row[$h] ?? '';
                $typeAttr = is_numeric($v) ? 'Number' : 'String';
                $xml .= '<Cell><Data ss:Type="'.$typeAttr.'">'.htmlspecialchars((string) $v).'</Data></Cell>';
            }
            $xml .= '</Row>';
        }
        $xml .= '</Table></Worksheet></Workbook>';

        return response($xml, 200, [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => "attachment; filename=\"{$type}.xls\"",
        ]);
    }
}
