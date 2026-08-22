<?php

namespace Database\Seeders;

use App\Models\ClientGstr2bInvoice;
use App\Models\ClientGstr2bRecord;
use App\Models\ClientGstReturn;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * A second demo client configured as GST Regular + Quarterly (QRMP), with real
 * billing/GSTR-2B/return data spread across the current financial year — so the
 * Quarterly Client Dashboard can actually be exercised end to end instead of
 * only ever being tested against the Monthly demo account.
 */
class QuarterlyDemoClientSeeder extends Seeder
{
    public function run(): void
    {
        if (User::where('email', 'quarterly@abkhanassociates.com')->exists()) {
            $this->command?->info('Quarterly demo client already exists — skipping.');

            return;
        }

        DB::transaction(fn () => $this->seed());
        $this->command?->info('Quarterly demo client seeded: quarterly@abkhanassociates.com / Client@2026');
    }

    private function seed(): void
    {
        $user = User::create([
            'name' => 'Bluewave Textiles',
            'email' => 'quarterly@abkhanassociates.com',
            'password' => Hash::make('Client@2026'),
            'role' => 'client',
            'phone' => '9876500001',
        ]);

        $profile = ClientProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Bluewave Textiles LLP',
            'client_name' => 'Rohan Deshmukh',
            'gstin' => '27AACFB4321Q1Z8',
            'pan' => 'AACFB4321Q',
            'has_gst' => true,
            'dealer_type' => 'regular',
            'gst_filing_frequency' => 'quarterly',
            'state_code' => '27',
            'state' => 'Maharashtra',
            'country' => 'India',
            'address' => 'Plot 14, MIDC Industrial Area, Andheri East',
            'city' => 'Mumbai',
            'pincode' => '400093',
            'invoice_prefix' => 'BWT',
            'bill_of_supply_prefix' => 'BWB',
            'credit_note_prefix' => 'BWC',
            'debit_note_prefix' => 'BWD',
            'quotation_prefix' => 'BWQ',
            'invoice_next_number' => 1,
            'bill_of_supply_next_number' => 1,
            'credit_note_next_number' => 1,
            'debit_note_next_number' => 1,
            'quotation_next_number' => 1,
            'terms_conditions' => 'Payment due within 15 days.',
        ]);

        $customer = Customer::create([
            'client_profile_id' => $profile->id,
            'name' => 'Coastal Retail Traders',
            'email' => 'accounts@coastalretail.example',
            'phone' => '9820011223',
            'gstin' => '27AAECC1122F1Z4',
            'gst_status' => 'registered',
            'state_code' => '27',
            'state' => 'Maharashtra',
            'billing_address' => 'Andheri, Mumbai, Maharashtra',
        ]);

        // FY 2026-27 (Apr 2026 - Mar 2027), current "today" sits mid-Q2 (22 Aug 2026).
        $fyStartYear = 2026;

        // A handful of tax invoices per quarter with distinct amounts, so the quarterly
        // Sales Overview bars and Billing Overview totals are genuinely different per quarter
        // (not the same number repeated four times).
        $invoicePlan = [
            // [monthOffsetFromApr(0-11), day, taxable, gstRate]
            [0, 8, 180000, 18],  // Apr
            [1, 20, 240000, 18], // May
            [2, 5, 95000, 12],   // Jun
            [3, 14, 310000, 18], // Jul
            [4, 2, 275000, 18],  // Aug (this FY, up to "today" 22 Aug 2026)
            [6, 18, 150000, 18], // Oct
            [7, 9, 220000, 12],  // Nov
            [8, 25, 400000, 18], // Dec
            [9, 11, 190000, 18], // Jan
            [10, 6, 260000, 18], // Feb
            [11, 19, 330000, 18], // Mar
        ];

        $invNo = 1;
        foreach ($invoicePlan as [$monthOffset, $day, $taxable, $rate]) {
            $month = 4 + $monthOffset;
            $year = $fyStartYear;
            if ($month > 12) {
                $month -= 12;
                $year += 1;
            }
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $half = round($taxable * $rate / 100 / 2, 2);
            $grand = $taxable + ($half * 2);

            CommercialDocument::create([
                'client_profile_id' => $profile->id,
                'customer_id' => $customer->id,
                'type' => 'tax_invoice',
                'number' => sprintf('BWT/%d-%s/%04d', $fyStartYear, substr((string) ($fyStartYear + 1), -2), $invNo++),
                'document_date' => $date,
                'place_of_supply' => $profile->state_code,
                'is_inter_state' => false,
                'taxable_amount' => $taxable,
                'cgst_amount' => $half,
                'sgst_amount' => $half,
                'igst_amount' => 0,
                'total_amount' => $grand,
                'grand_total' => $grand,
                'status' => 'issued',
                'issued_at' => $date.' 10:00:00',
            ]);
        }

        // A couple of debit/credit notes + a cancelled invoice, for Billing Overview variety.
        CommercialDocument::create([
            'client_profile_id' => $profile->id, 'customer_id' => $customer->id, 'type' => 'debit_note',
            'number' => 'BWD/2026-27/0001', 'document_date' => "{$fyStartYear}-07-22",
            'place_of_supply' => $profile->state_code, 'is_inter_state' => false,
            'taxable_amount' => 12000, 'cgst_amount' => 1080, 'sgst_amount' => 1080, 'igst_amount' => 0,
            'total_amount' => 14160, 'grand_total' => 14160, 'status' => 'issued', 'issued_at' => "{$fyStartYear}-07-22 11:00:00",
        ]);
        CommercialDocument::create([
            'client_profile_id' => $profile->id, 'customer_id' => $customer->id, 'type' => 'credit_note',
            'number' => 'BWC/2026-27/0001', 'document_date' => "{$fyStartYear}-08-05",
            'place_of_supply' => $profile->state_code, 'is_inter_state' => false,
            'taxable_amount' => 8000, 'cgst_amount' => 720, 'sgst_amount' => 720, 'igst_amount' => 0,
            'total_amount' => 9440, 'grand_total' => 9440, 'status' => 'issued', 'issued_at' => "{$fyStartYear}-08-05 11:00:00",
        ]);
        CommercialDocument::create([
            'client_profile_id' => $profile->id, 'customer_id' => $customer->id, 'type' => 'tax_invoice',
            'number' => sprintf('BWT/%d-%s/%04d', $fyStartYear, substr((string) ($fyStartYear + 1), -2), $invNo++),
            'document_date' => "{$fyStartYear}-05-11",
            'place_of_supply' => $profile->state_code, 'is_inter_state' => false,
            'taxable_amount' => 50000, 'cgst_amount' => 4500, 'sgst_amount' => 4500, 'igst_amount' => 0,
            'total_amount' => 59000, 'grand_total' => 59000, 'status' => 'cancelled', 'issued_at' => "{$fyStartYear}-05-11 11:00:00",
        ]);

        // GSTR-2B reconciliation data: an uploaded record + invoices for Q1's months (Apr-Jun),
        // mostly matched with a couple left unmatched, so the reconciliation cards + match rate
        // are real, non-zero numbers.
        $record = ClientGstr2bRecord::create([
            'client_profile_id' => $profile->id,
            'financial_year' => $fyStartYear.'-'.substr((string) ($fyStartYear + 1), -2),
            'tax_period' => sprintf('%04d-%02d', $fyStartYear, 6),
            'file_path' => 'client-gstr2b/'.$user->id.'/gstr2b-2026-q1.json',
            'file_name' => 'gstr2b-2026-q1.json',
            'file_type' => 'application/json',
            'file_size' => 2048,
        ]);

        $gstr2bPlan = [
            ['2026-04-14', 45000, 'matched'], ['2026-04-22', 32000, 'matched'],
            ['2026-05-03', 61000, 'matched'], ['2026-05-19', 27500, 'matched'],
            ['2026-06-09', 38000, 'matched'], ['2026-06-25', 52000, 'unmatched'],
            ['2026-04-30', 19000, 'matched'], ['2026-05-27', 41000, 'unmatched'],
        ];
        foreach ($gstr2bPlan as $i => [$date, $taxable, $status]) {
            $gst = round($taxable * 0.18, 2);
            ClientGstr2bInvoice::create([
                'client_profile_id' => $profile->id,
                'gstr2b_record_id' => $record->id,
                'financial_year' => $fyStartYear.'-'.substr((string) ($fyStartYear + 1), -2),
                'tax_period' => substr($date, 0, 7),
                'supplier_gstin' => '27AAAAA'.str_pad((string) $i, 4, '0', STR_PAD_LEFT).'A1Z5',
                'supplier_name' => 'Supplier '.($i + 1),
                'invoice_number' => 'SUP/'.($i + 1),
                'invoice_date' => $date,
                'invoice_value' => $taxable + $gst,
                'taxable_value' => $taxable,
                'cgst' => $gst / 2,
                'sgst' => $gst / 2,
                'igst' => 0,
                'total_gst' => $gst,
                'itc_eligibility' => 'eligible',
                'match_status' => $status,
            ]);
        }

        // Q1 (Apr-Jun) is well past its due date by "today" — mark it filed, so the compliance
        // grid shows a genuine Filed / Pending / Upcoming spread rather than all-pending.
        ClientGstReturn::create([
            'client_profile_id' => $profile->id, 'tax_period' => "{$fyStartYear}-Q1",
            'return_type' => ClientGstReturn::TYPE_GSTR1, 'status' => 'filed', 'filed_on' => "{$fyStartYear}-07-10",
        ]);
        ClientGstReturn::create([
            'client_profile_id' => $profile->id, 'tax_period' => "{$fyStartYear}-Q1",
            'return_type' => ClientGstReturn::TYPE_GSTR3B, 'status' => 'filed', 'filed_on' => "{$fyStartYear}-07-20",
        ]);
    }
}
