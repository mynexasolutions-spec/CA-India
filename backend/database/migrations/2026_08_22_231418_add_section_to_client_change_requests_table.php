<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_change_requests', function (Blueprint $table) {
            // 'branding' | 'bank' | 'invoice_settings' | 'numbering' — each Settings tab now
            // tracks its own independent approval workflow instead of one bundled request.
            $table->string('section', 30)->nullable()->after('client_profile_id');
        });

        // Backfill existing rows: infer the section from which fields the payload/assets touch.
        // A pre-existing bundled request most commonly touched bank + numbering + invoice
        // settings together via the old single form — default those to 'bank' as the closest
        // single bucket, but branding-only requests (asset uploads with empty payload) map
        // to 'branding'.
        DB::table('client_change_requests')->whereNull('section')->orderBy('id')->get()->each(function ($row) {
            $hasAsset = $row->logo_path || $row->signature_path || $row->seal_path || $row->qr_code_path;
            $payload = json_decode($row->payload ?? '[]', true) ?: [];
            $section = 'bank';
            if ($hasAsset && empty($payload)) {
                $section = 'branding';
            } elseif (array_intersect(array_keys($payload), ['signatory_name', 'terms_conditions']) && count($payload) <= 2) {
                $section = 'invoice_settings';
            } elseif (array_intersect(array_keys($payload), ['invoice_prefix', 'bill_of_supply_prefix', 'credit_note_prefix', 'debit_note_prefix', 'quotation_prefix'])) {
                $section = 'numbering';
            }
            DB::table('client_change_requests')->where('id', $row->id)->update(['section' => $section]);
        });
    }

    public function down(): void
    {
        Schema::table('client_change_requests', function (Blueprint $table) {
            $table->dropColumn('section');
        });
    }
};
