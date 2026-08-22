<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_gst_returns', function (Blueprint $table) {
            // 'GSTR1' or 'GSTR3B'. Existing rows default to GSTR3B (the return type this
            // table originally tracked before per-form filing was introduced).
            $table->string('return_type', 10)->default('GSTR3B')->after('tax_period');
        });

        Schema::table('client_gst_returns', function (Blueprint $table) {
            $table->dropUnique(['client_profile_id', 'tax_period']);
            $table->unique(['client_profile_id', 'tax_period', 'return_type']);
        });
    }

    public function down(): void
    {
        Schema::table('client_gst_returns', function (Blueprint $table) {
            $table->dropUnique(['client_profile_id', 'tax_period', 'return_type']);
        });

        Schema::table('client_gst_returns', function (Blueprint $table) {
            $table->dropColumn('return_type');
            $table->unique(['client_profile_id', 'tax_period']);
        });
    }
};
