<?php

namespace App\Services\Billing;

use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\DocumentLineItem;
use App\Models\TdsTcsSection;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class InvoiceService
{
    public function create(ClientProfile $profile, array $data): CommercialDocument
    {
        return DB::transaction(function () use ($profile, $data) {
            $status = $data['status'] ?? 'draft';
            $type = $data['type'] ?? 'tax_invoice';
            BillingPolicy::assertDocumentType($profile, $type);
            $isInter = (bool) ($data['is_inter_state'] ?? false);
            $isRcm = BillingPolicy::rcmAllowed($profile) && (bool) ($data['is_reverse_charge'] ?? false);
            abort_if($isRcm && ! BillingPolicy::rcmAllowed($profile), 422, 'Reverse charge is only available for regular GST dealers.');
            BillingPolicy::assertReferenceDocument($profile, $type, $data['reference_document_id'] ?? null);
            [$taxDeductionType, $tdsSection, $tdsRate] = $this->resolveTdsTcs($data, $type);
            $calc = GstCalculator::calculate(
                $data['lines'] ?? [],
                $isInter,
                array_key_exists('round_off', $data) ? (float) $data['round_off'] : null,
                BillingPolicy::taxesEnabled($profile, $isRcm),
                $taxDeductionType,
                $tdsRate
            );

            $allocateNumber = $status === 'issued';
            $number = $data['number'] ?? ($allocateNumber
                ? $this->nextNumber($profile, $type)
                : $this->draftNumber($profile, $type, $data['document_date'] ?? null));
            BillingPolicy::assertUniqueNumber($profile, $number);

            $doc = CommercialDocument::create($this->docPayload($profile, $data, $calc, $type, $number, $isInter, $isRcm, $status, $allocateNumber, $taxDeductionType, $tdsSection, $tdsRate));
            $this->syncLines($doc, $calc['lines']);

            if ($allocateNumber && empty($data['number'])) {
                $this->bumpNextNumber($profile, $type);
            }

            return $doc->load(['lineItems', 'customer', 'clientProfile', 'referenceDocument']);
        });
    }

    /**
     * Billing / Edit Request spec — an issued document is directly editable, no
     * admin approval needed, as long as its month isn't locked (no GST Filing
     * Confirmation submitted, GST Return not yet filed). Once locked, only an
     * admin-approved Request Edit (edit_allowed) can unlock a single save.
     */
    public function updateDraft(CommercialDocument $doc, ClientProfile $profile, array $data): CommercialDocument
    {
        $isIssuedFamily = in_array($doc->status, ['issued', 'partial', 'paid'], true);
        $directEditable = $isIssuedFamily && ! BillingPolicy::isDirectEditLocked($profile, $doc->document_date?->toDateString());
        $unlockedIssued = $isIssuedFamily && $doc->edit_allowed;
        $keepIssued = $directEditable || $unlockedIssued;
        abort_unless($doc->status === 'draft' || $keepIssued, 422, 'This document is locked for direct edits — a GST Filing Confirmation has been submitted (or the GST Return filed) for its period. Please use Request Edit.');

        return DB::transaction(function () use ($doc, $profile, $data, $keepIssued, $unlockedIssued) {
            $isInter = (bool) ($data['is_inter_state'] ?? $doc->is_inter_state);
            $type = $doc->type; // type cannot change on update
            BillingPolicy::assertDocumentType($profile, $type);
            $isRcm = BillingPolicy::rcmAllowed($profile) && (bool) ($data['is_reverse_charge'] ?? $doc->is_reverse_charge);
            BillingPolicy::assertReferenceDocument($profile, $type, $data['reference_document_id'] ?? $doc->reference_document_id);
            $data = array_key_exists('tax_deduction_type', $data) ? $data : $data + ['tax_deduction_type' => $doc->tax_deduction_type, 'tds_tcs_section_id' => $doc->tds_tcs_section_id];
            $data = array_key_exists('currency', $data) ? $data : $data + ['currency' => $doc->currency];
            [$taxDeductionType, $tdsSection, $tdsRate] = $this->resolveTdsTcs($data, $type);
            $calc = GstCalculator::calculate(
                $data['lines'] ?? [],
                $isInter,
                array_key_exists('round_off', $data) ? (float) $data['round_off'] : null,
                BillingPolicy::taxesEnabled($profile, $isRcm),
                $taxDeductionType,
                $tdsRate
            );
            $status = $keepIssued ? $doc->status : 'draft';
            $payload = $this->docPayload($profile, $data, $calc, $type, $doc->number, $isInter, $isRcm, $status, $keepIssued, $taxDeductionType, $tdsSection, $tdsRate);
            if ($unlockedIssued) {
                // The one-time admin-approved unlock is consumed on save; a direct edit
                // of an already-unlocked period doesn't touch edit_allowed at all.
                $payload['edit_allowed'] = false;
            }
            if ($keepIssued) {
                $payload['issued_at'] = $doc->issued_at;
            }
            $doc->update($payload);
            $doc->lineItems()->delete();
            $this->syncLines($doc, $calc['lines']);

            $doc = $doc->fresh()->load(['lineItems', 'customer', 'clientProfile', 'referenceDocument']);
            if ($keepIssued) {
                $this->generatePdf($doc);
            }

            return $doc->fresh()->load(['lineItems', 'customer', 'clientProfile', 'referenceDocument']);
        });
    }

    public function convertQuotation(CommercialDocument $quotation, ClientProfile $profile): CommercialDocument
    {
        abort_unless($quotation->type === 'quotation', 422, 'Only quotations can be converted.');
        abort_unless(! $quotation->converted_document_id, 422, 'Quotation already converted.');
        abort_unless(in_array($quotation->status, ['draft', 'issued'], true), 422, 'Quotation cannot be converted.');
        BillingPolicy::assertDocumentType($profile, 'tax_invoice');

        $quotation->loadMissing('lineItems');

        return DB::transaction(function () use ($quotation, $profile) {
            $lines = $quotation->lineItems->map(fn ($l) => [
                'product_id' => $l->product_id,
                'description' => $l->description,
                'hsn_sac' => $l->hsn_sac,
                'qty' => $l->qty,
                'unit' => $l->unit,
                'rate' => $l->rate,
                'discount_percent' => $l->discount_percent,
                'discount_amount' => $l->discount_amount,
                'gst_rate' => $l->gst_rate,
            ])->all();

            $invoice = $this->create($profile, [
                'type' => 'tax_invoice',
                'customer_id' => $quotation->customer_id,
                'document_date' => now()->toDateString(),
                'due_date' => $quotation->due_date?->toDateString(),
                'place_of_supply' => $quotation->place_of_supply,
                'payment_terms' => $quotation->payment_terms,
                'is_inter_state' => $quotation->is_inter_state,
                'is_reverse_charge' => $quotation->is_reverse_charge,
                'notes' => trim(($quotation->notes ? $quotation->notes."\n" : '').'Converted from quotation '.$quotation->number),
                'terms' => $quotation->terms,
                'status' => 'issued',
                'lines' => $lines,
            ]);

            $quotation->update([
                'converted_document_id' => $invoice->id,
                'status' => 'cancelled',
                'notes' => trim(($quotation->notes ? $quotation->notes."\n" : '').'Converted to '.$invoice->number),
            ]);

            return $invoice;
        });
    }

    public function duplicate(CommercialDocument $source, ClientProfile $profile): CommercialDocument
    {
        BillingPolicy::assertDocumentType($profile, $source->type);
        $source->loadMissing('lineItems');

        $lines = $source->lineItems->map(fn ($l) => [
            'product_id' => $l->product_id,
            'description' => $l->description,
            'hsn_sac' => $l->hsn_sac,
            'qty' => $l->qty,
            'unit' => $l->unit,
            'rate' => $l->rate,
            'discount_percent' => $l->discount_percent,
            'discount_amount' => $l->discount_amount,
            'gst_rate' => $l->gst_rate,
        ])->all();

        return $this->create($profile, [
            'type' => $source->type,
            'customer_id' => $source->customer_id,
            'reference_document_id' => $source->type === 'amendment' ? $source->reference_document_id : (
                in_array($source->type, ['credit_note', 'debit_note'], true) ? $source->reference_document_id : null
            ),
            'document_date' => now()->toDateString(),
            'due_date' => $source->due_date?->toDateString(),
            'place_of_supply' => $source->place_of_supply,
            'payment_terms' => $source->payment_terms,
            'is_inter_state' => $source->is_inter_state,
            'is_reverse_charge' => $source->is_reverse_charge,
            'notes' => $source->notes,
            'terms' => $source->terms,
            'status' => 'draft',
            'lines' => $lines,
        ]);
    }

    public function destroyQuotation(CommercialDocument $doc, ClientProfile $profile): void
    {
        abort_unless($doc->client_profile_id === $profile->id, 403);
        abort_unless($doc->type === 'quotation', 422, 'Only quotations can be deleted.');
        abort_unless(! $doc->converted_document_id, 422, 'Converted quotations cannot be deleted.');
        $doc->lineItems()->delete();
        $doc->delete();
    }

    /**
     * Cancellation is a status change only — the document, its number, dates,
     * amounts and line items are always preserved and remain viewable/downloadable.
     * Never call ->delete() here.
     */
    public function cancel(CommercialDocument $doc, string $reason): CommercialDocument
    {
        abort_if($doc->status === 'cancelled', 422, 'This document is already cancelled.');
        abort_if($doc->type === 'quotation' && $doc->converted_document_id, 422, 'A converted quotation cannot be cancelled.');

        $doc->update([
            'status' => 'cancelled',
            'cancellation_reason' => $reason,
            'cancelled_at' => now(),
        ]);

        return $doc->fresh(['lineItems', 'customer', 'referenceDocument']);
    }

    public function issue(CommercialDocument $doc, ClientProfile $profile): CommercialDocument
    {
        abort_unless($doc->status === 'draft', 422, 'Only drafts can be issued');

        return DB::transaction(function () use ($doc, $profile) {
            $wasDraftNumber = str_starts_with($doc->number, 'DRAFT-');
            $number = $wasDraftNumber ? $this->nextNumber($profile, $doc->type) : $doc->number;
            BillingPolicy::assertUniqueNumber($profile, $number, $doc->id);

            $doc->update([
                'number' => $number,
                'status' => 'issued',
                'issued_at' => now(),
                'share_token' => $doc->share_token ?: Str::random(40),
            ]);

            if ($wasDraftNumber) {
                $this->bumpNextNumber($profile, $doc->type);
            }

            $doc = $doc->fresh()->load(['lineItems', 'customer', 'clientProfile', 'referenceDocument']);
            $this->generatePdf($doc);

            return $doc->fresh()->load(['lineItems', 'customer', 'clientProfile', 'referenceDocument']);
        });
    }

    public function preview(ClientProfile $profile, array $data): array
    {
        $type = $data['type'] ?? 'tax_invoice';
        BillingPolicy::assertDocumentType($profile, $type);
        $isInter = (bool) ($data['is_inter_state'] ?? false);
        $isRcm = BillingPolicy::rcmAllowed($profile) && (bool) ($data['is_reverse_charge'] ?? false);
        [$taxDeductionType, , $tdsRate] = $this->resolveTdsTcs($data, $type);
        $calc = GstCalculator::calculate(
            $data['lines'] ?? [],
            $isInter,
            array_key_exists('round_off', $data) ? (float) $data['round_off'] : null,
            BillingPolicy::taxesEnabled($profile, $isRcm),
            $taxDeductionType,
            $tdsRate
        );

        return [
            'profile' => $profile,
            'customer_id' => $data['customer_id'] ?? null,
            'type' => $type,
            'document_date' => $data['document_date'] ?? now()->toDateString(),
            'place_of_supply' => $data['place_of_supply'] ?? null,
            'payment_terms' => $data['payment_terms'] ?? null,
            'is_inter_state' => $isInter,
            'is_reverse_charge' => $isRcm,
            'reference_document_id' => $data['reference_document_id'] ?? null,
            ...$calc,
        ];
    }

    public function nextNumber(ClientProfile $profile, string $type): string
    {
        // Lock so concurrent issues cannot reuse the same sequence.
        $locked = ClientProfile::whereKey($profile->id)->lockForUpdate()->first();
        if ($locked) {
            $profile->setRawAttributes($locked->getAttributes());
            $profile->syncOriginal();
        }

        $prefix = $this->prefixFor($profile, $type);
        $field = $this->nextNumberField($type);
        $seq = max(1, (int) ($profile->{$field} ?? 1));

        return $this->formatNumber($prefix, $seq);
    }

    /** Fixed short code per document type for draft numbers — distinct from the
     *  admin-configurable prefixes used for issued numbers (nextNumber()/prefixFor()). */
    private function draftPrefixFor(string $type): string
    {
        return match ($type) {
            'tax_invoice' => 'TAX',
            'debit_note' => 'DN',
            'credit_note' => 'CN',
            'bill_of_supply' => 'BOS',
            'quotation' => 'QT',
            'amendment' => 'AMD',
            default => strtoupper(substr($type, 0, 3)),
        };
    }

    /**
     * Draft number: DRAFT-{PREFIX}-NN, always exactly 2 digits (01-99), sequenced
     * independently per document type, scoped to the client and financial year.
     *
     * Reuses the lowest currently-unused number rather than an ever-incrementing
     * counter — once a draft is issued or deleted its slot is freed for reuse, so a
     * normal workflow (create → issue, repeat) never approaches the 99 ceiling.
     * Existing drafts are never renumbered; only a brand-new draft calls this.
     */
    public function draftNumber(ClientProfile $profile, string $type, ?string $documentDate = null): string
    {
        $prefix = $this->draftPrefixFor($type);
        $date = $documentDate ? \Carbon\Carbon::parse($documentDate) : now();
        $fyStartYear = $date->month >= 4 ? $date->year : $date->year - 1;
        $from = "{$fyStartYear}-04-01";
        $to = ($fyStartYear + 1).'-03-31';

        $used = CommercialDocument::where('client_profile_id', $profile->id)
            ->where('type', $type)
            ->where('status', 'draft')
            ->whereBetween('document_date', [$from, $to])
            ->pluck('number')
            ->map(function ($number) use ($prefix) {
                if (preg_match('/^DRAFT-'.preg_quote($prefix, '/').'-(\d+)$/', (string) $number, $m)) {
                    return (int) $m[1];
                }

                return null;
            })
            ->filter(fn ($n) => $n !== null)
            ->all();

        for ($seq = 1; $seq <= 99; $seq++) {
            if (! in_array($seq, $used, true)) {
                return sprintf('DRAFT-%s-%02d', $prefix, $seq);
            }
        }

        // Controlled business rule at the 99 boundary — never silently produce a 3-digit
        // draft number. 99 simultaneous open drafts of one type in one FY means existing
        // ones need to be issued or removed before another can be created.
        abort(422, "Draft {$prefix} numbers for this financial year are exhausted (DRAFT-{$prefix}-01 through DRAFT-{$prefix}-99 are all in use). Issue or delete an existing draft before creating another.");
    }

    private function prefixFor(ClientProfile $profile, string $type): string
    {
        return match ($type) {
            'credit_note' => $profile->credit_note_prefix ?: 'CN',
            'debit_note' => $profile->debit_note_prefix ?: 'DN',
            'bill_of_supply' => $profile->bill_of_supply_prefix ?: 'BOS',
            'quotation' => $profile->quotation_prefix ?: 'QT',
            'amendment' => $profile->amendment_prefix ?: 'AMD',
            'proforma' => 'PI',
            'delivery_challan' => 'DC',
            default => $profile->invoice_prefix ?: 'INV',
        };
    }

    /** Column that holds the next sequence for a document type (admin-settable). */
    private function nextNumberField(string $type): string
    {
        return match ($type) {
            'bill_of_supply' => 'bill_of_supply_next_number',
            'credit_note' => 'credit_note_next_number',
            'debit_note' => 'debit_note_next_number',
            'quotation' => 'quotation_next_number',
            'amendment' => 'amendment_next_number',
            default => 'invoice_next_number', // tax_invoice and fallbacks
        };
    }

    private function bumpNextNumber(ClientProfile $profile, string $type): void
    {
        $field = $this->nextNumberField($type);
        $profile->refresh();
        $profile->increment($field);
    }

    private function formatNumber(string $prefix, int $seq): string
    {
        $prefix = rtrim((string) $prefix);
        if ($prefix === '') {
            $prefix = 'DOC';
        }
        // Support FY-style prefixes ending with / e.g. INV/2026-27/01
        if (str_ends_with($prefix, '/') || str_ends_with($prefix, '-')) {
            return sprintf('%s%02d', $prefix, $seq);
        }

        return sprintf('%s-%02d', $prefix, $seq);
    }

    /**
     * Resolve and validate the TDS/TCS selection against the master list.
     * TDS/TCS only applies to Tax Invoices and Bills of Supply; the rate is
     * always read from the server-side section master, never trusted from input.
     *
     * @return array{0: ?string, 1: ?TdsTcsSection, 2: ?float}
     */
    private function resolveTdsTcs(array $data, string $docType): array
    {
        $deductionType = $data['tax_deduction_type'] ?? null;
        if (! in_array($deductionType, ['tds', 'tcs'], true)) {
            return [null, null, null];
        }
        abort_unless(
            in_array($docType, ['tax_invoice', 'bill_of_supply'], true),
            422,
            'TDS/TCS only applies to Tax Invoices and Bills of Supply.'
        );
        $sectionId = $data['tds_tcs_section_id'] ?? null;
        abort_if(empty($sectionId), 422, 'Select a TDS/TCS section.');
        $section = TdsTcsSection::where('id', $sectionId)
            ->where('type', $deductionType)
            ->where('is_active', true)
            ->first();
        abort_unless($section, 422, 'Selected TDS/TCS section is invalid.');

        return [$deductionType, $section, (float) $section->rate];
    }

    private function docPayload(
        ClientProfile $profile,
        array $data,
        array $calc,
        string $type,
        string $number,
        bool $isInter,
        bool $isRcm,
        string $status,
        bool $issued,
        ?string $taxDeductionType = null,
        ?TdsTcsSection $tdsSection = null,
        ?float $tdsRate = null
    ): array {
        return [
            'client_profile_id' => $profile->id,
            'customer_id' => $data['customer_id'] ?? null,
            'reference_document_id' => $data['reference_document_id'] ?? null,
            'type' => $type,
            'number' => $number,
            'document_date' => $data['document_date'] ?? now()->toDateString(),
            'due_date' => $data['due_date'] ?? null,
            'place_of_supply' => $data['place_of_supply'] ?? $profile->place_of_supply_default,
            'is_inter_state' => $isInter,
            'is_reverse_charge' => $isRcm,
            'discount_total' => $calc['discount_total'],
            'taxable_amount' => $calc['taxable_amount'],
            'cgst_amount' => $calc['cgst_amount'],
            'sgst_amount' => $calc['sgst_amount'],
            'igst_amount' => $calc['igst_amount'],
            'total_amount' => $calc['total_amount'],
            'round_off' => $calc['round_off'],
            'tax_deduction_type' => $taxDeductionType,
            'tds_tcs_section_id' => $tdsSection?->id,
            'tds_tcs_rate' => $tdsRate,
            'tds_tcs_amount' => $calc['tds_tcs_amount'] ?? 0,
            'grand_total' => $calc['grand_total'],
            'amount_in_words' => $calc['amount_in_words'],
            'status' => $status,
            'issued_at' => $issued ? now() : null,
            'notes' => $data['notes'] ?? null,
            'terms' => $data['terms'] ?? $profile->terms_conditions,
            'payment_terms' => $data['payment_terms'] ?? null,
            'currency' => $data['currency'] ?? 'INR',
            'share_token' => $data['share_token'] ?? Str::random(40),
        ];
    }

    private function syncLines(CommercialDocument $doc, array $lines): void
    {
        foreach ($lines as $line) {
            DocumentLineItem::create([
                'commercial_document_id' => $doc->id,
                'product_id' => $line['product_id'] ?? null,
                'description' => $line['description'] ?? 'Item',
                'hsn_sac' => $line['hsn_sac'] ?? null,
                'qty' => $line['qty'] ?? 1,
                'unit' => $line['unit'] ?? 'NOS',
                'rate' => $line['rate'] ?? 0,
                'discount_percent' => $line['discount_percent'] ?? 0,
                'discount_amount' => $line['discount_amount'] ?? 0,
                'gst_rate' => $line['gst_rate'] ?? 0,
                'taxable_amount' => $line['taxable_amount'] ?? 0,
                'cgst_amount' => $line['cgst_amount'] ?? 0,
                'sgst_amount' => $line['sgst_amount'] ?? 0,
                'igst_amount' => $line['igst_amount'] ?? 0,
                'total_amount' => $line['total_amount'] ?? 0,
                'sort_order' => $line['sort_order'] ?? 0,
            ]);
        }
    }

    public function generatePdf(CommercialDocument $doc): string
    {
        $doc->loadMissing(['lineItems', 'customer', 'clientProfile.user', 'referenceDocument', 'tdsTcsSection']);
        $pdf = Pdf::loadView('pdf.invoice', ['doc' => $doc])
            ->setPaper('a4', 'portrait')
            ->setOption(['isRemoteEnabled' => true, 'dpi' => 96, 'defaultFont' => 'DejaVu Sans']);
        // Render first: page_script draws immediately over existing pages,
        // so it must run only after all pages have been laid out.
        $pdf->render();
        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();
        $font = $fontMetrics->getFont('DejaVu Sans');
        $size = 8.5;
        $color = [0.4, 0.46, 0.55];
        $linkColor = [0.118, 0.251, 0.686];
        $canvas->page_script(function ($pageNumber, $pageCount, $canvas, $fontMetrics) use ($font, $size, $color, $linkColor) {
            // Rounded page frame on every page (HTML border cannot repeat per page)
            $frameColor = [0.118, 0.251, 0.686];
            $fw = 1.6;
            $r = 12;
            $x0 = 20;
            $y0 = 14;
            $x1 = $canvas->get_width() - 20;
            $y1 = $canvas->get_height() - 30;
            $canvas->line($x0 + $r, $y0, $x1 - $r, $y0, $frameColor, $fw);
            $canvas->line($x0 + $r, $y1, $x1 - $r, $y1, $frameColor, $fw);
            $canvas->line($x0, $y0 + $r, $x0, $y1 - $r, $frameColor, $fw);
            $canvas->line($x1, $y0 + $r, $x1, $y1 - $r, $frameColor, $fw);
            $canvas->arc($x0 + $r, $y0 + $r, $r, $r, 90, 180, $frameColor, $fw);
            $canvas->arc($x1 - $r, $y0 + $r, $r, $r, 0, 90, $frameColor, $fw);
            $canvas->arc($x1 - $r, $y1 - $r, $r, $r, 270, 360, $frameColor, $fw);
            $canvas->arc($x0 + $r, $y1 - $r, $r, $r, 180, 270, $frameColor, $fw);

            $y = $canvas->get_height() - 24;
            $prefix = 'Generated by ';
            $linkText = 'www.abkhanassociates.com';
            $prefixWidth = $fontMetrics->getTextWidth($prefix, $font, $size);
            $linkWidth = $fontMetrics->getTextWidth($linkText, $font, $size);
            $lineHeight = $fontMetrics->getFontHeight($font, $size);
            $canvas->text(28, $y, $prefix, $font, $size, $color);
            $canvas->text(28 + $prefixWidth, $y, $linkText, $font, $size, $linkColor);
            $canvas->add_link('https://www.abkhanassociates.com', 28 + $prefixWidth, $y, $linkWidth, $lineHeight);

            $text = "Page {$pageNumber} of {$pageCount}";
            $width = $fontMetrics->getTextWidth($text, $font, $size);
            $canvas->text($canvas->get_width() - 28 - $width, $y, $text, $font, $size, $color);
        });
        $dir = 'invoices/' . $doc->client_profile_id;
        $safeNumber = preg_replace('/[^A-Za-z0-9\-]/', '_', $doc->number);
        $path = $dir . '/' . $doc->type . '-' . $safeNumber . '.pdf';
        Storage::disk('public')->makeDirectory($dir);
        Storage::disk('public')->put($path, $pdf->output());
        $doc->update(['pdf_path' => $path]);

        return $path;
    }
}
