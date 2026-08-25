<?php

namespace App\Services\Billing;

use App\Models\ClientGstReturn;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\GstFilingRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BillingPolicy
{
    public const GST_RATES = [0, 1, 5, 6, 12, 18, 28, 40];

    /** The Billing module starts at FY 2026-27 — no document date, dashboard stat, report,
     * or FY selector may ever go earlier than this, regardless of what a request sends. */
    public const MIN_BILLING_FY_START_DATE = '2026-04-01';
    public const MIN_BILLING_FY_START_YEAR = 2026;

    /** Clamp a requested "from" date (or none) so it never precedes the Billing floor. */
    public static function clampFromDate(?string $from): string
    {
        if (!$from || $from < self::MIN_BILLING_FY_START_DATE) {
            return self::MIN_BILLING_FY_START_DATE;
        }

        return $from;
    }

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
        // Draft numbers are gap-filled by InvoiceService::draftNumber() so they shouldn't
        // collide in normal use — this check remains as a race-condition safety net.
        $exists = CommercialDocument::where('client_profile_id', $profile->id)
            ->where('number', $number)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->exists();

        abort_if($exists, 422, 'Invoice number already exists for this client.');
    }

    /** The GST return tax_period label for a document date, per the profile's filing frequency. */
    public static function periodOf(ClientProfile $profile, string $documentDate): string
    {
        $date = Carbon::parse($documentDate);

        if ($profile->gst_filing_frequency === 'quarterly') {
            return $date->year.'-Q'.ceil($date->month / 3);
        }

        return $date->format('Y-m');
    }

    public static function isPeriodFiled(ClientProfile $profile, ?string $documentDate): bool
    {
        if (!$documentDate || !$profile->has_gst) {
            return false;
        }

        return ClientGstReturn::where('client_profile_id', $profile->id)
            ->where('tax_period', self::periodOf($profile, $documentDate))
            ->where('status', 'filed')
            ->exists();
    }

    /** All tax_period labels already filed for this client — for bulk-tagging a list of documents. */
    public static function filedPeriods(ClientProfile $profile): array
    {
        return ClientGstReturn::where('client_profile_id', $profile->id)
            ->where('status', 'filed')
            ->pluck('tax_period')
            ->all();
    }

    public static function assertNotLocked(ClientProfile $profile, ?string $documentDate): void
    {
        if (self::isPeriodFiled($profile, $documentDate)) {
            abort(403, 'GST Return for this period has already been filed. This invoice cannot be edited directly. Please issue a Credit Note, Debit Note, or Amendment, as applicable.');
        }
    }

    /**
     * Billing Module spec §18/§25 — Request Edit is only available while the
     * GST Return for the document's period has not yet been filed. Once filed,
     * correction must go through Credit Note / Debit Note / Amendment instead.
     */
    public static function assertEditRequestAllowed(ClientProfile $profile, ?string $documentDate): void
    {
        if (self::isPeriodFiled($profile, $documentDate)) {
            abort(422, 'Request Edit is not available because the GST Return for this document\'s period has already been filed. Please issue a Credit Note, Debit Note, or Amendment instead.');
        }
    }

    /**
     * Billing / Edit Request spec — has the client already submitted a GST Filing
     * Confirmation for this document's month? This is the client's own pre-filing
     * confirmation/review submission (GstFilingRequest), a distinct, earlier stage
     * than the admin actually filing the return with the government (ClientGstReturn).
     * Always month-scoped (filing_period is stored as Y-m), independent of the
     * client's overall monthly/quarterly gst_filing_frequency.
     */
    public static function isFilingConfirmationSubmitted(int $clientProfileId, ?string $documentDate): bool
    {
        if (! $documentDate) {
            return false;
        }

        $period = Carbon::parse($documentDate)->format('Y-m');

        return in_array($period, self::submittedFilingPeriods($clientProfileId), true);
    }

    /** All filing_period (Y-m) values with an active GST Filing Confirmation for this
     *  client — for bulk-tagging a list of documents without an N+1 query per row. */
    public static function submittedFilingPeriods(int $clientProfileId): array
    {
        return GstFilingRequest::where('client_profile_id', $clientProfileId)
            ->whereIn('status', ['Pending CA Review', 'Approved for Filing', 'GST Filed'])
            ->pluck('filing_period')
            ->all();
    }

    /**
     * Whether an issued document can be edited directly without going through
     * Request Edit → Admin approval. Locked once either:
     *  - the client has submitted a GST Filing Confirmation for the month (earlier,
     *    client-initiated stage — Request Edit still works here), or
     *  - the GST Return has actually been filed by the admin (later, final stage —
     *    Request Edit is also disabled at that point, per assertEditRequestAllowed).
     */
    public static function isDirectEditLocked(ClientProfile $profile, ?string $documentDate): bool
    {
        return self::isPeriodFiled($profile, $documentDate)
            || self::isFilingConfirmationSubmitted($profile->id, $documentDate);
    }

    /**
     * Database-portable "YYYY-MM" grouping expression for a date column, for use in
     * selectRaw()/groupBy() month-wise aggregates. DATE_FORMAT() is MySQL-only and
     * fails on SQLite — this app's actual database engine in both local dev and
     * production (README's stated MySQL target is aspirational, not what's deployed).
     * Filtering by a single month should use a whereBetween on real date bounds
     * instead (see GstFilingController::periodBounds()) — this helper is only for
     * the SELECT/GROUP BY expression itself, which has no such portable equivalent.
     */
    public static function monthGroupExpr(string $column): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', {$column})"
            : "DATE_FORMAT({$column}, '%Y-%m')";
    }
}
