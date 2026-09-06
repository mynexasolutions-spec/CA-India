<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_gstr2b_records', function (Blueprint $table) {
            // Admin Portal "GSTR-2B Bills Available / No Bills in GSTR-2B" status (GSTR-3B
            // Filing Request reconciliation gate spec) — a period the admin marks "No Bills"
            // gets a record with no uploaded file, so it satisfies the same "has a record for
            // this period" check Gstr2bReconciliationService::isMonthReconciled() already does,
            // without needing a dummy file upload.
            $table->boolean('no_bills')->default(false)->after('tax_period');
            $table->string('file_path')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('client_gstr2b_records', function (Blueprint $table) {
            $table->dropColumn('no_bills');
            $table->string('file_path')->nullable(false)->change();
        });
    }
};
