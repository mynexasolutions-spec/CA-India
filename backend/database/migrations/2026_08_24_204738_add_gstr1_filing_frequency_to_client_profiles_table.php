<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            // Under QRMP, GSTR-1 can be filed monthly (via IFF) even when GSTR-3B is quarterly
            // for the same client — so GSTR-1's cycle must be configurable independently of
            // gst_filing_frequency, which continues to represent GSTR-3B's cycle (and keeps
            // driving the existing invoice-period-lock logic, unchanged).
            // Nullable and no backfill needed: null means "inherit gst_filing_frequency",
            // handled entirely in application code (GstReturnController::compliance()).
            $table->string('gstr1_filing_frequency', 20)->nullable()->after('gst_filing_frequency');
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn('gstr1_filing_frequency');
        });
    }
};
