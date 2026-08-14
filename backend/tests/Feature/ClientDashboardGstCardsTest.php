<?php

namespace Tests\Feature;

use App\Models\ClientGstr2bInvoice;
use App\Models\ClientGstr2bRecord;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientDashboardGstCardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_cards_follow_upload_matching_and_liability_changes(): void
    {
        $user = User::factory()->create(['role' => 'client']);
        $profile = ClientProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Dashboard Client',
            'has_gst' => true,
            'dealer_type' => 'regular',
        ]);
        CommercialDocument::create([
            'client_profile_id' => $profile->id,
            'type' => 'tax_invoice',
            'number' => 'INV-DASH-001',
            'document_date' => '2026-04-10',
            'taxable_amount' => 1000,
            'cgst_amount' => 250.25,
            'sgst_amount' => 250.25,
            'igst_amount' => 0,
            'total_amount' => 1500.50,
            'status' => 'issued',
        ]);
        Sanctum::actingAs($user);

        $dashboardUrl = '/api/billing/dashboard?from=2026-04-01&to=2027-03-31';
        $this->getJson($dashboardUrl)
            ->assertOk()
            ->assertJsonPath('gst_dashboard.output_gst', 500.5)
            ->assertJsonPath('gst_dashboard.eligible_itc', 0)
            ->assertJsonPath('gst_dashboard.gst_payable', 500.5)
            ->assertJsonPath('gst_dashboard.excess_itc', 0)
            ->assertJsonPath('gst_dashboard.total_gstr2b_invoices', 0)
            ->assertJsonPath('gst_dashboard.matched_invoices', 0)
            ->assertJsonPath('gst_dashboard.unmatched_invoices', 0);

        $record = ClientGstr2bRecord::create([
            'client_profile_id' => $profile->id,
            'financial_year' => '2026-27',
            'tax_period' => '2026-04',
            'file_path' => 'gstr2b/dashboard.json',
            'file_name' => 'dashboard.json',
            'uploaded_by' => $user->id,
        ]);
        $invoice = ClientGstr2bInvoice::create([
            'client_profile_id' => $profile->id,
            'gstr2b_record_id' => $record->id,
            'financial_year' => '2026-27',
            'tax_period' => '2026-04',
            'invoice_number' => 'PUR-DASH-001',
            'total_gst' => 600.75,
            'itc_eligibility' => 'eligible',
        ]);

        $this->getJson($dashboardUrl)
            ->assertOk()
            ->assertJsonPath('gst_dashboard.eligible_itc', 0)
            ->assertJsonPath('gst_dashboard.gst_payable', 500.5)
            ->assertJsonPath('gst_dashboard.total_gstr2b_invoices', 1)
            ->assertJsonPath('gst_dashboard.matched_invoices', 0)
            ->assertJsonPath('gst_dashboard.unmatched_invoices', 1);

        $this->patchJson("/api/client/gstr2b/invoices/{$invoice->id}/match-status", [
            'match_status' => ClientGstr2bInvoice::MATCH_STATUS_MATCHED,
        ])->assertOk();

        $this->getJson($dashboardUrl)
            ->assertOk()
            ->assertJsonPath('gst_dashboard.output_gst', 500.5)
            ->assertJsonPath('gst_dashboard.eligible_itc', 600.75)
            ->assertJsonPath('gst_dashboard.gst_payable', 0)
            ->assertJsonPath('gst_dashboard.excess_itc', 100.25)
            ->assertJsonPath('gst_dashboard.total_gstr2b_invoices', 1)
            ->assertJsonPath('gst_dashboard.matched_invoices', 1)
            ->assertJsonPath('gst_dashboard.unmatched_invoices', 0);

        CommercialDocument::create([
            'client_profile_id' => $profile->id,
            'type' => 'debit_note',
            'number' => 'DN-DASH-001',
            'document_date' => '2026-04-20',
            'taxable_amount' => 500,
            'cgst_amount' => 0,
            'sgst_amount' => 0,
            'igst_amount' => 150.50,
            'total_amount' => 650.50,
            'status' => 'paid',
        ]);

        $this->getJson($dashboardUrl)
            ->assertOk()
            ->assertJsonPath('gst_dashboard.output_gst', 651)
            ->assertJsonPath('gst_dashboard.eligible_itc', 600.75)
            ->assertJsonPath('gst_dashboard.gst_payable', 50.25)
            ->assertJsonPath('gst_dashboard.excess_itc', 0);
    }

    public function test_non_regular_client_does_not_receive_gst_cards(): void
    {
        $user = User::factory()->create(['role' => 'client']);
        ClientProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Composition Client',
            'has_gst' => true,
            'dealer_type' => 'composition',
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/billing/dashboard?from=2026-04-01&to=2027-03-31')
            ->assertOk()
            ->assertJsonPath('gst_dashboard', null);
    }
}
