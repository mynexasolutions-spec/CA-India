<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Proprietor / Authorised Signatory of the party/company — required per the
            // Parties "Add New Company" screen spec, distinct from contact_person (the
            // day-to-day contact, which stays optional).
            $table->string('proprietor_name')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('proprietor_name');
        });
    }
};
