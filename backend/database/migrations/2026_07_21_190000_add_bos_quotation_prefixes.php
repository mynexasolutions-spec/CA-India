<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('client_profiles', 'bill_of_supply_prefix')) {
                $table->string('bill_of_supply_prefix', 40)->default('BOS')->after('invoice_prefix');
            }
            if (! Schema::hasColumn('client_profiles', 'quotation_prefix')) {
                $table->string('quotation_prefix', 40)->default('QT')->after('debit_note_prefix');
            }
        });

        // Widen existing prefix columns to allow FY-style values e.g. INV/2026-27/
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->string('invoice_prefix', 40)->default('INV')->change();
            $table->string('credit_note_prefix', 40)->default('CN')->change();
            $table->string('debit_note_prefix', 40)->default('DN')->change();
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn(['bill_of_supply_prefix', 'quotation_prefix']);
        });
    }
};
