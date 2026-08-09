<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hsn_sac_codes', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['hsn', 'sac'])->index();
            $table->string('code', 20);
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('code_length')->default(0)->index();
            $table->timestamps();

            $table->unique(['type', 'code']);
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hsn_sac_codes');
    }
};
