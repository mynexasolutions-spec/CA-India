<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->string('credit_note_prefix', 20)->default('CN')->after('invoice_prefix');
            $table->string('debit_note_prefix', 20)->default('DN')->after('credit_note_prefix');
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn(['credit_note_prefix', 'debit_note_prefix']);
        });
    }
};
