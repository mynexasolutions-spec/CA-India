<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gst_filing_requests', function (Blueprint $table) {
            // Entered by the admin when marking a request "GST Filed" — mandatory at that
            // point (enforced in GstFilingController::updateStatus), and synced onto the
            // matching client_gst_returns row so the Client Portal's Filing History shows
            // the same Filed On / ACK No. without any separate manual entry there.
            $table->date('filing_date')->nullable()->after('status');
            $table->string('ack_no', 50)->nullable()->after('filing_date');
        });
    }

    public function down(): void
    {
        Schema::table('gst_filing_requests', function (Blueprint $table) {
            $table->dropColumn(['filing_date', 'ack_no']);
        });
    }
};
