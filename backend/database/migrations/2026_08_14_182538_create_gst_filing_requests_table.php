<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('gst_filing_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_profile_id')->constrained()->cascadeOnDelete();
            $table->string('financial_year');
            $table->string('filing_period');
            $table->string('return_type');
            $table->string('status')->default('Pending CA Review');
            $table->integer('total_bills')->default(0);
            $table->decimal('taxable_value', 12, 2)->default(0);
            $table->decimal('total_cgst', 12, 2)->default(0);
            $table->decimal('total_sgst', 12, 2)->default(0);
            $table->decimal('total_igst', 12, 2)->default(0);
            $table->decimal('total_gst', 12, 2)->default(0);
            $table->boolean('client_declaration')->default(false);
            $table->timestamps();
        });

        Schema::create('gst_filing_request_document', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gst_filing_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('commercial_document_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gst_filing_request_document');
        Schema::dropIfExists('gst_filing_requests');
    }
};
