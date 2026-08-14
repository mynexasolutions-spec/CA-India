<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientGstr2bInvoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class Gstr2bController extends Controller
{
    private const SORTABLE = [
        'supplier_gstin', 'supplier_name', 'invoice_number', 'invoice_date',
        'taxable_value', 'cgst', 'sgst', 'igst', 'total_gst', 'match_status',
    ];

    private function profileId(Request $request): int
    {
        abort_unless($request->user()->clientProfile, 403);

        return $request->user()->clientProfile->id;
    }

    private function filtered(Request $request): Builder
    {
        $q = ClientGstr2bInvoice::where('client_profile_id', $this->profileId($request));

        if ($fy = $request->input('financial_year')) {
            $q->where('financial_year', $fy);
        }
        if ($period = $request->input('tax_period')) {
            $q->where('tax_period', $period);
        }
        if ($gstin = $request->input('supplier_gstin')) {
            $q->where('supplier_gstin', 'like', "%{$gstin}%");
        }
        if ($name = $request->input('supplier_name')) {
            $q->where('supplier_name', 'like', "%{$name}%");
        }
        if ($invoiceNumber = $request->input('invoice_number')) {
            $q->where('invoice_number', 'like', "%{$invoiceNumber}%");
        }
        if ($matchStatus = $request->input('match_status')) {
            abort_unless(
                in_array($matchStatus, ClientGstr2bInvoice::MATCH_STATUSES, true),
                422,
                'Invalid match status.'
            );
            $q->where('match_status', $matchStatus);
        }
        if ($search = $request->input('q')) {
            $q->where(function ($w) use ($search) {
                $w->where('supplier_name', 'like', "%{$search}%")
                    ->orWhere('supplier_gstin', 'like', "%{$search}%")
                    ->orWhere('invoice_number', 'like', "%{$search}%");
            });
        }

        return $q;
    }

    private function sorted(Builder $query, Request $request): Builder
    {
        $sort = in_array($request->input('sort'), self::SORTABLE, true)
            ? $request->input('sort')
            : 'invoice_date';
        $dir = $request->input('dir') === 'asc' ? 'asc' : 'desc';

        return $query->orderBy($sort, $dir);
    }

    /** @return array<string, int|float> */
    private function summary(Builder $query): array
    {
        $summary = (clone $query)
            ->selectRaw(
                'COUNT(*) AS total_invoices,
                SUM(CASE WHEN match_status = ? THEN 1 ELSE 0 END) AS matched_invoices,
                SUM(CASE WHEN match_status = ? THEN 1 ELSE 0 END) AS unmatched_invoices,
                COALESCE(SUM(CASE WHEN match_status = ? THEN total_gst ELSE 0 END), 0) AS matched_itc_amount,
                COALESCE(SUM(CASE WHEN match_status = ? THEN total_gst ELSE 0 END), 0) AS unmatched_itc_amount',
                [
                    ClientGstr2bInvoice::MATCH_STATUS_MATCHED,
                    ClientGstr2bInvoice::MATCH_STATUS_UNMATCHED,
                    ClientGstr2bInvoice::MATCH_STATUS_MATCHED,
                    ClientGstr2bInvoice::MATCH_STATUS_UNMATCHED,
                ]
            )
            ->first();

        return [
            'total_invoices' => (int) ($summary?->total_invoices ?? 0),
            'matched_invoices' => (int) ($summary?->matched_invoices ?? 0),
            'unmatched_invoices' => (int) ($summary?->unmatched_invoices ?? 0),
            'matched_itc_amount' => (float) ($summary?->matched_itc_amount ?? 0),
            'unmatched_itc_amount' => (float) ($summary?->unmatched_itc_amount ?? 0),
        ];
    }

    public function index(Request $request)
    {
        $perPage = min((int) $request->input('per_page', 25), 100);
        $query = $this->filtered($request);
        $payload = $this->sorted(clone $query, $request)->paginate($perPage)->toArray();
        $payload['summary'] = $this->summary($query);

        return response()->json($payload);
    }

    public function updateMatchStatus(Request $request, int $invoiceId)
    {
        $data = $request->validate([
            'match_status' => [
                'required',
                'string',
                Rule::in(ClientGstr2bInvoice::MATCH_STATUSES),
            ],
        ]);

        $invoice = ClientGstr2bInvoice::where('client_profile_id', $this->profileId($request))
            ->findOrFail($invoiceId);

        $invoice->update(['match_status' => $data['match_status']]);

        return response()->json($invoice->fresh());
    }

    public function export(Request $request)
    {
        $format = $request->input('format', 'csv');

        $rows = $this->sorted($this->filtered($request), $request)->get()->map(fn ($r) => [
            'Supplier GSTIN' => $r->supplier_gstin,
            'Supplier Name' => $r->supplier_name,
            'Invoice Number' => $r->invoice_number,
            'Invoice Date' => optional($r->invoice_date)->format('d-m-Y'),
            'Taxable Value' => (float) $r->taxable_value,
            'CGST' => (float) $r->cgst,
            'SGST' => (float) $r->sgst,
            'IGST' => (float) $r->igst,
            'Total GST' => (float) $r->total_gst,
            'ITC Eligibility' => $r->itc_eligibility ? ucfirst($r->itc_eligibility) : '—',
            'Match Status' => ucfirst($r->match_status),
        ])->all();

        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.report', [
                'title' => 'GSTR-2B',
                'from' => $request->input('financial_year', ''),
                'to' => $request->input('tax_period', ''),
                'rows' => $rows,
            ]);

            return $pdf->download('gstr2b.pdf');
        }

        if ($format === 'xlsx') {
            return $this->xlsxDownload($rows);
        }

        return $this->csvDownload($rows);
    }

    private function csvDownload(array $rows): StreamedResponse
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
        }, 'gstr2b.csv', ['Content-Type' => 'text/csv']);
    }

    private function xlsxDownload(array $rows)
    {
        $headers = array_keys($rows[0] ?? ['value' => '']);
        $xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="GSTR-2B"><Table>';
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
            'Content-Disposition' => 'attachment; filename="gstr2b.xls"',
        ]);
    }
}
