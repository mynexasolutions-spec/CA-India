<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            // Subscription gate: GST Compliance (GSTR-2B, GST Returns, GST Filing
            // Confirmation) is a separate add-on from core Billing. Defaults to true so
            // every existing client keeps today's access unchanged — only newly
            // restricted clients (set by Admin) see the "Not Subscribed" popup.
            $table->boolean('gst_compliance_enabled')->default(true)->after('has_gst');
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn('gst_compliance_enabled');
        });
    }
};
