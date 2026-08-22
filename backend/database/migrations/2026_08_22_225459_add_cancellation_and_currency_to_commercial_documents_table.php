<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            // Billing Module spec §18/§19: cancellation is a status change with a
            // preserved reason and timestamp — never a physical delete.
            $table->text('cancellation_reason')->nullable()->after('status');
            $table->timestamp('cancelled_at')->nullable()->after('cancellation_reason');
            // Billing Module spec §12-15: Currency field on every document type.
            $table->string('currency', 3)->default('INR')->after('payment_terms');
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropColumn(['cancellation_reason', 'cancelled_at', 'currency']);
        });
    }
};
