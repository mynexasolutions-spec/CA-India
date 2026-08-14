<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_gstr2b_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_profile_id')->constrained()->cascadeOnDelete();
            $table->string('financial_year', 7);
            $table->string('tax_period', 7);
            $table->string('file_path');
            $table->string('file_name')->nullable();
            $table->string('file_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['client_profile_id', 'tax_period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_gstr2b_records');
    }
};
