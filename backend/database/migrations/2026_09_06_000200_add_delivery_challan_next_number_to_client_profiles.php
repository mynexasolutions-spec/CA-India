<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('client_profiles', 'delivery_challan_next_number')) {
                $table->unsignedInteger('delivery_challan_next_number')->default(1)->after('amendment_next_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('client_profiles', 'delivery_challan_next_number')) {
                $table->dropColumn('delivery_challan_next_number');
            }
        });
    }
};
