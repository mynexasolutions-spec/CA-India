<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            // GSTR-2B has no filing action of its own (it's an auto-drafted GSTN statement),
            // but the portal still tracks its display/reconciliation cadence per client so the
            // Admin Client Profile can show Monthly/Quarterly consistently alongside GSTR-1/3B.
            // Nullable and no backfill needed: null means "inherit gst_filing_frequency",
            // resolved in application code (ClientProfileController::normalizeGstFields()).
            $table->string('gstr2b_filing_frequency', 20)->nullable()->after('gstr1_filing_frequency');
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn('gstr2b_filing_frequency');
        });
    }
};
