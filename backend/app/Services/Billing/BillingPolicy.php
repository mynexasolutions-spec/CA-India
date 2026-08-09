<?php

namespace App\Services\Billing;

use App\Models\ClientProfile;
use App\Models\CommercialDocument;

class BillingPolicy
{
    public const GST_RATES = [0, 1, 5, 6, 12, 18, 28, 40];

    public static function mode(ClientProfile $profile): string
    {
        if (! $profile->has_gst) {
            return 'retail';
        }

        return $profile->dealer_type === 'composition' ? 'composition' : 'regular';
    }

    public static function allowedTypes(ClientProfile $profile): array
    {
        $base = match (self::mode($profile)) {
            // Composition: Bill of Supply + Credit Notes only (Tax Invoice & Debit Notes locked)
            'composition' => ['bill_of_supply', 'credit_note', 'quotation'],
            'retail' => ['tax_invoice'],
            // Regular: Tax Invoice + Debit/Credit Notes (Bill of Supply locked)
            default => ['tax_invoice', 'credit_note', 'debit_note', 'quotation'],
        };

        return array_values(array_unique([...$base, 'amendment']));
    }

    public static function assertDocumentType(ClientProfile $profile, string $type): void
    {
        abort_unless(
            in_array($type, self::allowedTypes($profile), true),
            422,
            self::typeLockMessage($profile, $type)
        );
    }

    public static function typeLockMessage(ClientProfile $profile, string $type): string
    {
        if ($type === 'amendment') {
            return 'Amendments are not available for your billing profile.';
        }
        if (self::mode($profile) === 'retail' && $type !== 'tax_invoice') {
            return 'Non-GST clients can only create standard Invoices.';
        }
        if ($type === 'tax_invoice' && self::mode($profile) === 'composition') {
            return 'Tax Invoice is locked because your business is configured as a GST Composition Dealer in the Admin Portal.';
        }
        if ($type === 'debit_note' && self::mode($profile) === 'composition') {
            return 'Debit Note is locked because your business is configured as a GST Composition Dealer in the Admin Portal.';
        }
        if ($type === 'bill_of_supply' && self::mode($profile) === 'regular') {
            return 'Bill of Supply is locked because your business is configured as a Regular GST Dealer in the Admin Portal.';
        }
        if ($type === 'bill_of_supply' && self::mode($profile) === 'retail') {
            return 'Bill of Supply is not available because GST is not enabled on your profile.';
        }

        return 'This document type is not allowed for your billing profile.';
    }

    public static function taxesEnabled(ClientProfile $profile, bool $isReverseCharge = false): bool
    {
        if (! $profile->has_gst) {
            return false;
        }
        if ($profile->dealer_type === 'composition') {
            return false;
        }
        if ($isReverseCharge) {
            return false;
        }

        return true;
    }

    public static function rcmAllowed(ClientProfile $profile): bool
    {
        return $profile->has_gst && $profile->dealer_type === 'regular';
    }

    public static function assertReferenceDocument(
        ClientProfile $profile,
        string $type,
        ?int $referenceId,
        ?CommercialDocument $reference = null
    ): CommercialDocument {
        if ($type === 'amendment') {
            abort_unless($referenceId, 422, 'Original bill is required for amendments.');
            $ref = $reference ?: CommercialDocument::where('client_profile_id', $profile->id)
                ->where('id', $referenceId)
                ->first();
            abort_unless($ref, 422, 'Original document was not found.');
            $allowed = self::mode($profile) === 'retail'
                ? ['tax_invoice']
                : ['tax_invoice', 'credit_note', 'debit_note'];
            abort_unless(in_array($ref->type, $allowed, true), 422, 'Amendments apply only to Tax Invoice, Credit Note, or Debit Note.');
            abort_unless(in_array($ref->status, ['issued', 'paid', 'partial'], true), 422, 'Original document must be issued.');

            return $ref;
        }

        if (! in_array($type, ['credit_note', 'debit_note'], true)) {
            abort_if($referenceId, 422, 'Reference invoice is only valid for credit or debit notes.');

            return $reference ?? new CommercialDocument;
        }

        abort_unless($referenceId, 422, 'Original invoice number and date are required for credit/debit notes.');

        $ref = $reference ?: CommercialDocument::where('client_profile_id', $profile->id)
            ->where('id', $referenceId)
            ->first();

        abort_unless($ref, 422, 'Original invoice was not found for this client.');
        abort_unless($ref->type === 'tax_invoice', 422, 'Reference must be an issued tax invoice.');
        abort_unless(in_array($ref->status, ['issued', 'paid', 'partial'], true), 422, 'Reference invoice must be issued.');
        abort_unless($ref->document_date, 422, 'Original invoice date is missing on the selected invoice.');

        return $ref;
    }

    public static function assertUniqueNumber(ClientProfile $profile, string $number, ?int $exceptId = null): void
    {
        if (str_starts_with($number, 'DRAFT-')) {
            return;
        }

        $exists = CommercialDocument::where('client_profile_id', $profile->id)
            ->where('number', $number)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();

        abort_if($exists, 422, 'Invoice number already exists for this client.');
    }
}
