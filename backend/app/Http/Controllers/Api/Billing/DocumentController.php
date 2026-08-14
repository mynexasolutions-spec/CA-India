<?php

namespace App\Http\Controllers\Api\Billing;

use App\Http\Controllers\Controller;
use App\Models\CommercialDocument;
use App\Models\Customer;
use App\Models\Product;
use App\Services\Billing\BillingPolicy;
use App\Services\Billing\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function __construct(private InvoiceService $invoices) {}

    private function profile(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 403);

        return $profile;
    }

    public function index(Request $request)
    {
        $q = CommercialDocument::where('client_profile_id', $this->profile($request)->id)
            ->with('customer:id,name,gstin,gst_status')
            ->latest('document_date')
            ->latest('id');

        if ($request->filled('type')) {
            $q->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $q->where('status', $request->status);
        }
        if ($request->filled('party_id')) {
            $q->where('customer_id', $request->party_id);
        }
        if ($request->filled('from')) {
            $q->whereDate('document_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $q->whereDate('document_date', '<=', $request->to);
        }
        if ($request->filled('month')) {
            // YYYY-MM
            $q->whereRaw('DATE_FORMAT(document_date, "%Y-%m") = ?', [$request->month]);
        }
        if ($request->filled('fy')) {
            // FY like 2025-26 → Apr 1 2025 – Mar 31 2026
            [$y1] = explode('-', $request->fy);
            $start = sprintf('%d-04-01', (int) $y1);
            $end = sprintf('%d-03-31', (int) $y1 + 1);
            $q->whereBetween('document_date', [$start, $end]);
        }
        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('number', 'like', "%{$s}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$s}%"));
            });
        }

        $perPage = min(500, max(1, (int) $request->input('per_page', 25)));

        return response()->json($q->paginate($perPage));
    }

    public function store(Request $request)
    {
        $profile = $this->profile($request);
        $data = $this->validated($request, true, BillingPolicy::mode($profile) !== 'retail');
        if (!empty($data['document_date'])) {
            BillingPolicy::assertNotLocked($profile, $data['document_date']);
        }
        $this->assertOwnedRelations($profile, $data, $data['type'] ?? 'tax_invoice');
        BillingPolicy::assertReferenceDocument($profile, $data['type'] ?? 'tax_invoice', $data['reference_document_id'] ?? null);
        $doc = $this->invoices->create($profile, $data);
        if (($data['status'] ?? 'draft') === 'issued') {
            try {
                $this->invoices->generatePdf($doc);
            } catch (\Throwable $e) {
            }
        }

        return response()->json($doc->fresh(['lineItems', 'customer', 'referenceDocument', 'tdsTcsSection']), 201);
    }

    public function update(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        BillingPolicy::assertNotLocked($profile, $doc->document_date?->toDateString());
        
        $data = $this->validated($request, false, BillingPolicy::mode($profile) !== 'retail');
        if (!empty($data['document_date'])) {
            BillingPolicy::assertNotLocked($profile, $data['document_date']);
        }
        
        $this->assertOwnedRelations($profile, $data, $doc->type);
        $doc = $this->invoices->updateDraft($doc, $profile, $data);

        return response()->json($doc);
    }

    public function convert(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        $invoice = $this->invoices->convertQuotation($doc, $profile);
        try {
            $this->invoices->generatePdf($invoice);
        } catch (\Throwable $e) {
        }

        return response()->json($invoice->fresh(['lineItems', 'customer', 'referenceDocument']));
    }

    public function duplicate(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->with('lineItems')->findOrFail($id);
        $copy = $this->invoices->duplicate($doc, $profile);

        return response()->json($copy, 201);
    }

    public function destroy(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        BillingPolicy::assertNotLocked($profile, $doc->document_date?->toDateString());
        
        $this->invoices->destroyQuotation($doc, $profile);

        return response()->json(['message' => 'Quotation deleted']);
    }

    public function amendments(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        $rows = CommercialDocument::where('client_profile_id', $profile->id)
            ->where('type', 'amendment')
            ->where('reference_document_id', $doc->id)
            ->with('customer:id,name,gstin,gst_status')
            ->latest('id')
            ->get();

        return response()->json(['original' => $doc->only(['id', 'number', 'type', 'status', 'document_date', 'grand_total']), 'data' => $rows]);
    }

    public function issue(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        BillingPolicy::assertNotLocked($profile, $doc->document_date?->toDateString());
        
        $doc = $this->invoices->issue($doc, $profile);

        return response()->json($doc);
    }

    public function setPaymentStatus(Request $request, int $id)
    {
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        abort_unless(in_array($doc->status, ['issued', 'partial', 'paid'], true), 422, 'Only issued documents can be marked paid/unpaid');

        $data = $request->validate([
            'status' => 'required|in:paid,unpaid,partial',
        ]);

        $status = $data['status'] === 'unpaid' ? 'issued' : $data['status'];
        $doc->update(['status' => $status]);

        return response()->json($doc->fresh(['customer', 'lineItems']));
    }

    public function preview(Request $request)
    {
        $profile = $this->profile($request);
        $data = $this->validated($request, false, BillingPolicy::mode($profile) !== 'retail');
        $this->assertOwnedRelations($profile, $data, $data['type'] ?? 'tax_invoice');
        $preview = $this->invoices->preview($profile, $data);
        if (! empty($data['customer_id'])) {
            $preview['customer'] = Customer::where('client_profile_id', $profile->id)
                ->find($data['customer_id']);
        }

        return response()->json($preview);
    }

    public function show(Request $request, int $id)
    {
        $doc = CommercialDocument::where('client_profile_id', $this->profile($request)->id)
            ->with(['lineItems', 'customer', 'clientProfile', 'referenceDocument', 'tdsTcsSection'])
            ->findOrFail($id);

        return response()->json($doc);
    }

    public function pdf(Request $request, int $id)
    {
        $doc = CommercialDocument::where('client_profile_id', $this->profile($request)->id)->findOrFail($id);
        // Always regenerate so branding/bank/terms and template updates reflect live client data.
        $this->invoices->generatePdf($doc);
        $doc->refresh();

        return response()->json(['url' => '/storage/'.$doc->pdf_path, 'path' => $doc->pdf_path]);
    }

    public function emailDocument(Request $request, int $id)
    {
        $doc = CommercialDocument::where('client_profile_id', $this->profile($request)->id)
            ->with(['customer', 'clientProfile'])->findOrFail($id);
        $data = $request->validate(['email' => 'nullable|email']);
        $to = $data['email'] ?? $doc->customer?->email;
        abort_unless($to, 422, 'No email address available');
        $this->invoices->generatePdf($doc);
        $doc->refresh();
        $path = Storage::disk('public')->path($doc->pdf_path);
        try {
            Mail::raw(
                "Please find attached {$doc->type} {$doc->number}. Total: INR ".($doc->grand_total ?: $doc->total_amount),
                function ($m) use ($to, $doc, $path) {
                    $m->to($to)->subject(strtoupper(str_replace('_', ' ', $doc->type)).' '.$doc->number)
                        ->attach($path);
                }
            );
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Mailer: '.$e->getMessage(), 'pdf' => '/storage/'.$doc->pdf_path]);
        }

        return response()->json(['message' => 'Invoice emailed to '.$to]);
    }

    public function share(Request $request, string $token)
    {
        $doc = CommercialDocument::where('share_token', $token)
            ->with(['lineItems', 'customer', 'clientProfile', 'referenceDocument'])
            ->firstOrFail();

        // Optional JSON for API clients: /api/billing/share/{token}?format=json
        if ($request->query('format') === 'json') {
            return response()->json($doc);
        }

        if (! $doc->pdf_path || ! Storage::disk('public')->exists($doc->pdf_path)) {
            $this->invoices->generatePdf($doc);
            $doc->refresh();
        }

        $path = Storage::disk('public')->path($doc->pdf_path);
        $filename = preg_replace('/[^A-Za-z0-9\-_.]/', '_', $doc->number).'.pdf';

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    private function validated(Request $request, bool $requireLines = true, bool $requireHsn = true): array
    {
        $rules = [
            'type' => 'nullable|in:tax_invoice,bill_of_supply,credit_note,debit_note,quotation,amendment,proforma,delivery_challan',
            'customer_id' => 'nullable|integer',
            'reference_document_id' => 'nullable|integer',
            'document_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'place_of_supply' => 'nullable|string|max:120',
            'payment_terms' => 'nullable|string|max:200',
            'is_inter_state' => 'boolean',
            'is_reverse_charge' => 'boolean',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'status' => 'nullable|in:draft,issued,cancelled,paid,partial',
            'round_off' => 'nullable|numeric',
            'tax_deduction_type' => 'nullable|in:tds,tcs',
            'tds_tcs_section_id' => 'nullable|integer|exists:tds_tcs_sections,id',
            'lines' => ($requireLines ? 'required|' : 'nullable|').'array|min:1',
            'lines.*.description' => 'required_with:lines|string|max:255',
            'lines.*.qty' => 'required_with:lines|numeric',
            'lines.*.rate' => 'required_with:lines|numeric',
            'lines.*.gst_rate' => ['nullable', 'numeric', Rule::in(BillingPolicy::GST_RATES)],
            'lines.*.hsn_sac' => array_merge(
                [$requireHsn ? 'required' : 'nullable', 'string'],
                [Rule::exists('hsn_sac_codes', 'code')]
            ),
            'lines.*.unit' => 'nullable|string',
            'lines.*.discount_percent' => 'nullable|numeric',
            'lines.*.discount_amount' => 'nullable|numeric',
            'lines.*.product_id' => 'nullable|integer',
        ];

        return $request->validate($rules);
    }

    private function assertOwnedRelations($profile, array $data, ?string $fallbackType = null): void
    {
        $type = $data['type'] ?? $fallbackType ?? 'tax_invoice';

        if (! empty($data['customer_id'])) {
            abort_unless(
                Customer::where('client_profile_id', $profile->id)->where('id', $data['customer_id'])->exists(),
                422,
                'Selected party does not belong to your account.'
            );
        }

        if (! empty($data['reference_document_id'])) {
            $ref = CommercialDocument::where('client_profile_id', $profile->id)
                ->where('id', $data['reference_document_id'])->first();
            abort_unless($ref, 422, 'Selected reference invoice does not belong to your account.');
            if (in_array($type, ['credit_note', 'debit_note', 'amendment'], true)) {
                BillingPolicy::assertReferenceDocument($profile, $type, $data['reference_document_id'], $ref);
            }
        } elseif (in_array($type, ['credit_note', 'debit_note', 'amendment'], true)) {
            abort(422, $type === 'amendment'
                ? 'Original bill is required for amendments.'
                : 'Original invoice number and date are required for credit/debit notes.');
        }

        foreach ($data['lines'] ?? [] as $line) {
            if (empty($line['product_id'])) {
                continue;
            }
            abort_unless(
                Product::where('client_profile_id', $profile->id)->where('id', $line['product_id'])->exists(),
                422,
                'Selected product does not belong to your account.'
            );
        }
    }
}
