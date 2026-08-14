<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('client_profiles', 'gst_filing_frequency')) {
            Schema::table('client_profiles', function (Blueprint $table) {
                // monthly or quarterly
                $table->string('gst_filing_frequency', 20)->nullable()->after('dealer_type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('client_profiles', 'gst_filing_frequency')) {
            Schema::table('client_profiles', function (Blueprint $table) {
                $table->dropColumn('gst_filing_frequency');
            });
        }
    }
};
