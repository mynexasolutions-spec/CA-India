<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_gstr2b_invoices', function (Blueprint $table) {
            $table->string('match_status', 10)->default('unmatched')->after('itc_reason');
            $table->index(
                ['client_profile_id', 'match_status'],
                'client_gstr2b_profile_match_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('client_gstr2b_invoices', function (Blueprint $table) {
            $table->dropIndex('client_gstr2b_profile_match_status_index');
            $table->dropColumn('match_status');
        });
    }
};
