<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('gst_status', 20)->default('unregistered')->after('gstin');
        });

        DB::table('customers')->whereNotNull('gstin')->where('gstin', '!=', '')->update(['gst_status' => 'registered']);
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('gst_status');
        });
    }
};
