<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('client_profiles', 'bill_of_supply_next_number')) {
                $table->unsignedInteger('bill_of_supply_next_number')->default(1)->after('invoice_next_number');
            }
            if (! Schema::hasColumn('client_profiles', 'credit_note_next_number')) {
                $table->unsignedInteger('credit_note_next_number')->default(1)->after('bill_of_supply_next_number');
            }
            if (! Schema::hasColumn('client_profiles', 'debit_note_next_number')) {
                $table->unsignedInteger('debit_note_next_number')->default(1)->after('credit_note_next_number');
            }
            if (! Schema::hasColumn('client_profiles', 'quotation_next_number')) {
                $table->unsignedInteger('quotation_next_number')->default(1)->after('debit_note_next_number');
            }
            if (! Schema::hasColumn('client_profiles', 'amendment_next_number')) {
                $table->unsignedInteger('amendment_next_number')->default(1)->after('quotation_next_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $cols = [
                'bill_of_supply_next_number',
                'credit_note_next_number',
                'debit_note_next_number',
                'quotation_next_number',
                'amendment_next_number',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('client_profiles', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
