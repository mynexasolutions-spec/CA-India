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
 * A third demo client configured as GST Composition, with real bill-of-supply turnover and a
 * filed Q1 CMP-08 — so the Composition Dashboard can be exercised end to end instead of only
 * ever getting a null gst_dashboard.
 */
class CompositionDemoClientSeeder extends Seeder
{
    public function run(): void
    {
        if (User::where('email', 'composition@abkhanassociates.com')->exists()) {
            $this->command?->info('Composition demo client already exists — skipping.');

            return;
        }

        DB::transaction(fn () => $this->seed());
        $this->command?->info('Composition demo client seeded: composition@abkhanassociates.com / Client@2026');
    }

    private function seed(): void
    {
        $user = User::create([
            'name' => 'Sunrise Bakery',
            'email' => 'composition@abkhanassociates.com',
            'password' => Hash::make('Client@2026'),
            'role' => 'client',
            'phone' => '9876500002',
        ]);

        $profile = ClientProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Sunrise Bakery & Sweets',
            'client_name' => 'Meera Kulkarni',
            'gstin' => '27AAGFB7788R1Z2',
            'pan' => 'AAGFB7788R',
            'has_gst' => true,
            'dealer_type' => 'composition',
            'gst_filing_frequency' => 'quarterly',
            'composition_rate' => 1.00,
            'state_code' => '27',
            'state' => 'Maharashtra',
            'country' => 'India',
            'address' => '22 Linking Road, Bandra West',
            'city' => 'Mumbai',
            'pincode' => '400050',
            'bill_of_supply_prefix' => 'SBS',
            'credit_note_prefix' => 'SBC',
            'quotation_prefix' => 'SBQ',
            'bill_of_supply_next_number' => 1,
            'credit_note_next_number' => 1,
            'quotation_next_number' => 1,
            'terms_conditions' => 'Payment due on delivery.',
        ]);

        $customer = Customer::create([
            'client_profile_id' => $profile->id,
            'name' => 'Local Retail Counter',
            'email' => 'orders@localretail.example',
            'phone' => '9820099887',
            'gst_status' => 'unregistered',
            'state_code' => '27',
            'state' => 'Maharashtra',
            'billing_address' => 'Bandra West, Mumbai, Maharashtra',
        ]);

        $fyStartYear = 2026;

        // Bills of Supply spread across all 4 quarters — composition dealers can't charge GST
        // separately, so these have no cgst/sgst/igst, only a taxable (turnover) amount.
        $plan = [
            [0, 10, 120000], [1, 18, 95000], [2, 22, 110000],  // Q1: Apr-Jun
            [3, 8, 105000], [4, 14, 98000], [5, 26, 88000],    // Q2: Jul-Sep (up to "today" 22 Aug)
            [6, 12, 102000], [7, 20, 115000], [8, 5, 130000],  // Q3: Oct-Dec
            [9, 9, 108000], [10, 16, 121000], [11, 21, 140000], // Q4: Jan-Mar
        ];
        $bosNo = 1;
        foreach ($plan as [$monthOffset, $day, $taxable]) {
            $month = 4 + $monthOffset;
            $year = $fyStartYear;
            if ($month > 12) {
                $month -= 12;
                $year += 1;
            }
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);

            CommercialDocument::create([
                'client_profile_id' => $profile->id,
                'customer_id' => $customer->id,
                'type' => 'bill_of_supply',
                'number' => sprintf('SBS/%d-%s/%04d', $fyStartYear, substr((string) ($fyStartYear + 1), -2), $bosNo++),
                'document_date' => $date,
                'place_of_supply' => $profile->state_code,
                'is_inter_state' => false,
                'taxable_amount' => $taxable,
                'cgst_amount' => 0,
                'sgst_amount' => 0,
                'igst_amount' => 0,
                'total_amount' => $taxable,
                'grand_total' => $taxable,
                'status' => 'issued',
                'issued_at' => $date.' 09:30:00',
            ]);
        }

        // GSTR-2B for purchases (composition dealers can't claim ITC on these, but still
        // reconcile them under CMP-08 terminology for audit purposes) — Q1 only, for realism.
        $record = ClientGstr2bRecord::create([
            'client_profile_id' => $profile->id,
            'financial_year' => $fyStartYear.'-'.substr((string) ($fyStartYear + 1), -2),
            'tax_period' => sprintf('%04d-%02d', $fyStartYear, 6),
            'file_path' => 'client-gstr2b/'.$user->id.'/gstr2b-2026-q1.json',
            'file_name' => 'gstr2b-2026-q1.json',
            'file_type' => 'application/json',
            'file_size' => 1536,
        ]);
        $gstr2bPlan = [
            ['2026-04-12', 22000, 'matched'], ['2026-05-08', 18000, 'matched'],
            ['2026-06-15', 27000, 'matched'], ['2026-06-28', 14000, 'unmatched'],
        ];
        foreach ($gstr2bPlan as $i => [$date, $taxable, $status]) {
            $gst = round($taxable * 0.05, 2);
            ClientGstr2bInvoice::create([
                'client_profile_id' => $profile->id,
                'gstr2b_record_id' => $record->id,
                'financial_year' => $fyStartYear.'-'.substr((string) ($fyStartYear + 1), -2),
                'tax_period' => substr($date, 0, 7),
                'supplier_gstin' => '27BBBBB'.str_pad((string) $i, 4, '0', STR_PAD_LEFT).'B1Z5',
                'supplier_name' => 'Ingredient Supplier '.($i + 1),
                'invoice_number' => 'ING/'.($i + 1),
                'invoice_date' => $date,
                'invoice_value' => $taxable + $gst,
                'taxable_value' => $taxable,
                'cgst' => $gst / 2,
                'sgst' => $gst / 2,
                'igst' => 0,
                'total_gst' => $gst,
                'itc_eligibility' => 'ineligible', // composition dealers cannot avail ITC at all
                'match_status' => $status,
            ]);
        }

        // Q1's CMP-08 is well past its 18 Jul due date — mark it filed.
        ClientGstReturn::create([
            'client_profile_id' => $profile->id, 'tax_period' => "{$fyStartYear}-Q1",
            'return_type' => ClientGstReturn::TYPE_CMP08, 'status' => 'filed', 'filed_on' => "{$fyStartYear}-07-15",
        ]);
    }
}
