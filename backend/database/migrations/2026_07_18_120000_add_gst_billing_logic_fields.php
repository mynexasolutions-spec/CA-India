<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('client_profiles', 'has_gst')) {
            Schema::table('client_profiles', function (Blueprint $table) {
                $table->boolean('has_gst')->default(false)->after('gstin');
                $table->string('dealer_type', 20)->nullable()->after('has_gst');
            });
        }

        if (! Schema::hasColumn('commercial_documents', 'is_reverse_charge')) {
            Schema::table('commercial_documents', function (Blueprint $table) {
                $table->boolean('is_reverse_charge')->default(false)->after('is_inter_state');
            });
        }

        DB::table('client_profiles')->whereNotNull('gstin')->where('gstin', '!=', '')->where(function ($q) {
            $q->whereNull('has_gst')->orWhere('has_gst', false);
        })->update([
            'has_gst' => true,
            'dealer_type' => 'regular',
        ]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('commercial_documents', 'is_reverse_charge')) {
            Schema::table('commercial_documents', function (Blueprint $table) {
                $table->dropColumn('is_reverse_charge');
            });
        }

        if (Schema::hasColumn('client_profiles', 'has_gst')) {
            Schema::table('client_profiles', function (Blueprint $table) {
                $table->dropColumn(['has_gst', 'dealer_type']);
            });
        }
    }
};
