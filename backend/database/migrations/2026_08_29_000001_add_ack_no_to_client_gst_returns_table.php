<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_gst_returns', function (Blueprint $table) {
            // Populated when a return is marked filed — either directly by the admin GST
            // Returns grid, or synced automatically from a GST Filing Request being marked
            // "GST Filed" (GstFilingController::updateStatus).
            $table->string('ack_no', 50)->nullable()->after('filed_on');
        });
    }

    public function down(): void
    {
        Schema::table('client_gst_returns', function (Blueprint $table) {
            $table->dropColumn('ack_no');
        });
    }
};
