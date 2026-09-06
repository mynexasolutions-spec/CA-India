<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Branch (If any) — Parties "Add New Company" screen spec. Optional, shown
            // alongside the GSTIN in the party picker so users can tell branches of the
            // same company apart when selecting a party on a document.
            $table->string('branch_name')->nullable()->after('shipping_address');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('branch_name');
        });
    }
};
