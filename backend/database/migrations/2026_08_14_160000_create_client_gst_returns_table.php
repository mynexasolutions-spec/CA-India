<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_gst_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_profile_id')->constrained()->cascadeOnDelete();
            
            // Format: "YYYY-MM" (e.g., "2026-04") or "YYYY-Q#" (e.g., "2026-Q1")
            $table->string('tax_period', 10);
            
            // Status: 'filed'
            $table->string('status', 20)->default('filed');
            
            $table->timestamp('filed_on')->nullable();
            $table->foreignId('filed_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            
            $table->unique(['client_profile_id', 'tax_period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_gst_returns');
    }
};
