<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->string('tax_deduction_type')->nullable()->after('grand_total'); // null, tds, tcs
            $table->foreignId('tds_tcs_section_id')->nullable()->after('tax_deduction_type')
                ->constrained('tds_tcs_sections')->nullOnDelete();
            $table->decimal('tds_tcs_rate', 5, 2)->nullable()->after('tds_tcs_section_id');
            $table->decimal('tds_tcs_amount', 14, 2)->default(0)->after('tds_tcs_rate');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tds_tcs_section_id');
            $table->dropColumn(['tax_deduction_type', 'tds_tcs_rate', 'tds_tcs_amount']);
        });
    }
};
