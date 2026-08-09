<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->string('client_code')->nullable()->unique()->after('user_id');
            $table->string('client_name')->nullable()->after('client_code');
            $table->string('constitution_type')->nullable();
            $table->string('business_type')->nullable();
            $table->date('date_of_incorporation')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('mobile')->nullable();
            $table->string('alt_mobile')->nullable();
            $table->string('alt_email')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('India');
            $table->string('website')->nullable();
            $table->string('aadhaar')->nullable();
            $table->string('gst_portal_username')->nullable();
            $table->text('gst_portal_password')->nullable();
            $table->string('tan')->nullable();
            $table->text('tan_portal_password')->nullable();
            $table->text('it_portal_password')->nullable();
            $table->string('udyam')->nullable();
            $table->string('shop_establishment')->nullable();
            $table->string('iec')->nullable();
            $table->string('cin')->nullable();
            $table->string('llpin')->nullable();
            $table->string('pt_reg')->nullable();
            $table->string('esic')->nullable();
            $table->string('pf')->nullable();
            $table->string('bank_branch')->nullable();
            $table->string('account_holder_name')->nullable();
            $table->string('swift_code')->nullable();
            $table->string('account_type')->nullable();
            $table->string('upi_id')->nullable();
            $table->string('qr_code_path')->nullable();
            $table->string('seal_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'client_code', 'client_name', 'constitution_type', 'business_type',
                'date_of_incorporation', 'date_of_birth', 'mobile', 'alt_mobile', 'alt_email',
                'state', 'country', 'website', 'aadhaar', 'gst_portal_username', 'gst_portal_password',
                'tan', 'tan_portal_password', 'it_portal_password', 'udyam', 'shop_establishment',
                'iec', 'cin', 'llpin', 'pt_reg', 'esic', 'pf', 'bank_branch', 'account_holder_name',
                'swift_code', 'account_type', 'upi_id', 'qr_code_path', 'seal_path',
            ]);
        });
    }
};
