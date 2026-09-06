<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            // Delivery Challan spec — extra fields only used when type = delivery_challan;
            // nullable so every other document type is unaffected.
            $table->string('reason_for_transportation')->nullable();
            $table->string('reason_for_transportation_other')->nullable();
            $table->string('vehicle_no')->nullable();
            $table->string('transporter_name')->nullable();
            $table->string('eway_bill_no')->nullable();
            $table->string('receiver_name')->nullable();
            $table->dateTime('receiver_signature_datetime')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropColumn([
                'reason_for_transportation',
                'reason_for_transportation_other',
                'vehicle_no',
                'transporter_name',
                'eway_bill_no',
                'receiver_name',
                'receiver_signature_datetime',
            ]);
        });
    }
};
