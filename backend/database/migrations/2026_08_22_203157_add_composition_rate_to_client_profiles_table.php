<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            // GST composition scheme rate (%), e.g. 1.00 for traders/manufacturers,
            // 5.00 for restaurants (no alcohol), 6.00 for other service providers.
            // Only meaningful when dealer_type = 'composition'.
            $table->decimal('composition_rate', 4, 2)->default(1.00)->after('dealer_type');
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn('composition_rate');
        });
    }
};
