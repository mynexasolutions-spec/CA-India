<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tds_tcs_sections', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // tds, tcs
            $table->string('code'); // e.g. 194C, 206C(1H)
            $table->string('description')->nullable();
            $table->decimal('rate', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['type', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tds_tcs_sections');
    }
};
