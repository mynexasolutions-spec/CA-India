<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('contact_person')->nullable()->after('name');
            $table->string('state')->nullable()->after('state_code');
            $table->string('place_of_supply')->nullable()->after('state');
        });

        Schema::table('client_profiles', function (Blueprint $table) {
            $table->string('email')->nullable()->after('pan');
            $table->string('signatory_name')->nullable()->after('signature_path');
            $table->string('place_of_supply_default')->nullable()->after('state_code');
        });

        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->decimal('discount_total', 14, 2)->default(0)->after('taxable_amount');
            $table->decimal('round_off', 14, 2)->default(0)->after('igst_amount');
            $table->decimal('grand_total', 14, 2)->default(0)->after('round_off');
            $table->string('payment_terms')->nullable()->after('terms');
            $table->foreignId('reference_document_id')->nullable()->after('customer_id')
                ->constrained('commercial_documents')->nullOnDelete();
            $table->timestamp('issued_at')->nullable()->after('status');
        });

        Schema::table('document_line_items', function (Blueprint $table) {
            $table->decimal('discount_percent', 5, 2)->default(0)->after('rate');
            $table->decimal('discount_amount', 14, 2)->default(0)->after('discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('document_line_items', function (Blueprint $table) {
            $table->dropColumn(['discount_percent', 'discount_amount']);
        });
        Schema::table('commercial_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reference_document_id');
            $table->dropColumn(['discount_total', 'round_off', 'grand_total', 'payment_terms', 'issued_at']);
        });
        Schema::table('client_profiles', function (Blueprint $table) {
            $table->dropColumn(['email', 'signatory_name', 'place_of_supply_default']);
        });
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['contact_person', 'state', 'place_of_supply']);
        });
    }
};
