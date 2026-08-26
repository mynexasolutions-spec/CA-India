<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientGstr2bInvoice;
use App\Models\ClientGstr2bRecord;
use App\Models\ClientProfile;
use App\Services\Gstr2b\Gstr2bJsonParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class Gstr2bController extends Controller
{
    public function index(int $clientId)
    {
        ClientProfile::findOrFail($clientId);

        $records = ClientGstr2bRecord::where('client_profile_id', $clientId)
            ->withCount('invoices')
            ->with('uploader:id,name')
            ->orderByDesc('tax_period')
            ->get();

        return response()->json($records);
    }

    public function upload(Request $request, int $clientId)
    {
        ClientProfile::findOrFail($clientId);

        $data = $request->validate([
            'tax_period' => 'required|regex:/^\d{4}-\d{2}$/',
            'file' => 'required|file|mimes:pdf,xls,xlsx,json,csv|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->store('gstr2b/'.$clientId, 'public');

        $existing = ClientGstr2bRecord::where('client_profile_id', $clientId)
            ->where('tax_period', $data['tax_period'])
            ->first();

        $attrs = [
            'financial_year' => $this->deriveFinancialYear($data['tax_period']),
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ];

        if ($existing) {
            Storage::disk('public')->delete($existing->file_path);
            $existing->update($attrs);
            $record = $existing;
        } else {
            $record = ClientGstr2bRecord::create([
                'client_profile_id' => $clientId,
                'tax_period' => $data['tax_period'],
                ...$attrs,
            ]);
        }

        $parseWarning = null;

        if (strtolower($file->getClientOriginalExtension()) === 'json') {
            ClientGstr2bInvoice::where('gstr2b_record_id', $record->id)->delete();

            try {
                $rows = app(Gstr2bJsonParser::class)->parse(Storage::disk('public')->get($path));

                foreach ($rows as $row) {
                    ClientGstr2bInvoice::create([
                        ...$row,
                        'client_profile_id' => $clientId,
                        'gstr2b_record_id' => $record->id,
                        'financial_year' => $record->financial_year,
                        'tax_period' => $record->tax_period,
                    ]);
                }
            } catch (Throwable $e) {
                $parseWarning = $e->getMessage();
            }
        }

        $response = $record->fresh(['uploader:id,name'])->toArray();
        $response['parse_warning'] = $parseWarning;

        return response()->json($response, $existing ? 200 : 201);
    }

    public function destroy(int $clientId, int $recordId)
    {
        $record = ClientGstr2bRecord::where('client_profile_id', $clientId)->findOrFail($recordId);

        Storage::disk('public')->delete($record->file_path);
        $record->delete();

        return response()->json(['message' => 'Deleted']);
    }

    /** Replaces the invoice line items for a record with rows the admin's browser parsed
     * out of an Excel/CSV GSTR-2B export (the JSON format is parsed server-side in
     * upload(); spreadsheet formats don't have a PHP-side parser, so the frontend reads
     * the sheet with SheetJS and posts back the mapped rows instead). */
    public function bulkStoreInvoices(Request $request, int $clientId, int $recordId)
    {
        $record = ClientGstr2bRecord::where('client_profile_id', $clientId)->findOrFail($recordId);

        $data = $request->validate([
            'invoices' => 'present|array',
            'invoices.*.supplier_gstin' => 'nullable|string|max:20',
            'invoices.*.supplier_name' => 'nullable|string|max:255',
            'invoices.*.invoice_number' => 'nullable|string|max:255',
            'invoices.*.invoice_date' => 'nullable|date',
            'invoices.*.invoice_value' => 'nullable|numeric',
            'invoices.*.taxable_value' => 'nullable|numeric',
            'invoices.*.cgst' => 'nullable|numeric',
            'invoices.*.sgst' => 'nullable|numeric',
            'invoices.*.igst' => 'nullable|numeric',
            'invoices.*.cess' => 'nullable|numeric',
            'invoices.*.itc_eligibility' => ['nullable', 'string', Rule::in(ClientGstr2bInvoice::ITC_ELIGIBILITIES)],
            'invoices.*.itc_reason' => 'nullable|string|max:255',
        ]);

        ClientGstr2bInvoice::where('gstr2b_record_id', $record->id)->delete();

        foreach ($data['invoices'] as $row) {
            $cgst = (float) ($row['cgst'] ?? 0);
            $sgst = (float) ($row['sgst'] ?? 0);
            $igst = (float) ($row['igst'] ?? 0);

            ClientGstr2bInvoice::create([
                'client_profile_id' => $clientId,
                'gstr2b_record_id' => $record->id,
                'financial_year' => $record->financial_year,
                'tax_period' => $record->tax_period,
                'supplier_gstin' => $row['supplier_gstin'] ?? null,
                'supplier_name' => $row['supplier_name'] ?? null,
                'invoice_number' => $row['invoice_number'] ?? null,
                'invoice_date' => $row['invoice_date'] ?? null,
                'invoice_value' => (float) ($row['invoice_value'] ?? 0),
                'taxable_value' => (float) ($row['taxable_value'] ?? 0),
                'cgst' => $cgst,
                'sgst' => $sgst,
                'igst' => $igst,
                'cess' => (float) ($row['cess'] ?? 0),
                'total_gst' => $cgst + $sgst + $igst,
                'itc_eligibility' => $row['itc_eligibility'] ?? null,
                'itc_reason' => $row['itc_reason'] ?? null,
            ]);
        }

        return response()->json(
            ClientGstr2bInvoice::where('gstr2b_record_id', $record->id)->orderBy('invoice_date')->get()
        );
    }

    /** Structured invoice line items for one uploaded record — populated either by the
     * server-side JSON parser (upload()) or by bulkStoreInvoices() for spreadsheet formats. */
    public function invoices(int $clientId, int $recordId)
    {
        $record = ClientGstr2bRecord::where('client_profile_id', $clientId)->findOrFail($recordId);

        return response()->json(
            ClientGstr2bInvoice::where('gstr2b_record_id', $record->id)->orderBy('invoice_date')->get()
        );
    }

    /** Lets an admin correct/override the ITC eligibility the parser assigned to one
     * invoice line, with an optional reason (e.g. "Blocked credit u/s 17(5)"). */
    public function updateEligibility(Request $request, int $clientId, int $invoiceId)
    {
        $data = $request->validate([
            'itc_eligibility' => ['required', 'string', Rule::in(ClientGstr2bInvoice::ITC_ELIGIBILITIES)],
            'itc_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $invoice = ClientGstr2bInvoice::where('client_profile_id', $clientId)->findOrFail($invoiceId);
        $invoice->update($data);

        return response()->json($invoice->fresh());
    }

    private function deriveFinancialYear(string $taxPeriod): string
    {
        [$year, $month] = array_map('intval', explode('-', $taxPeriod));
        $startYear = $month >= 4 ? $year : $year - 1;

        return $startYear.'-'.substr((string) ($startYear + 1), -2);
    }
}
