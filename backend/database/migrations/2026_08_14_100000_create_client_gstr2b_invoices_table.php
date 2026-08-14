<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_gstr2b_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('gstr2b_record_id')->constrained('client_gstr2b_records')->cascadeOnDelete();
            $table->string('financial_year', 7);
            $table->string('tax_period', 7);
            $table->string('supplier_gstin', 20)->nullable();
            $table->string('supplier_name')->nullable();
            $table->string('invoice_number')->nullable();
            $table->date('invoice_date')->nullable();
            $table->decimal('invoice_value', 14, 2)->default(0);
            $table->decimal('taxable_value', 14, 2)->default(0);
            $table->decimal('cgst', 14, 2)->default(0);
            $table->decimal('sgst', 14, 2)->default(0);
            $table->decimal('igst', 14, 2)->default(0);
            $table->decimal('cess', 14, 2)->default(0);
            $table->decimal('total_gst', 14, 2)->default(0);
            $table->string('itc_eligibility', 20)->nullable();
            $table->string('itc_reason')->nullable();
            $table->timestamps();

            $table->index(['client_profile_id', 'tax_period']);
            $table->index('supplier_gstin');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_gstr2b_invoices');
    }
};
