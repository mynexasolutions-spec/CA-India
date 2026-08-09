<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_profile_id')->constrained('client_profiles')->cascadeOnDelete();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type', 40);
            $table->string('bill_number', 80);
            $table->string('reason', 80);
            $table->text('remarks')->nullable();
            $table->string('status', 20)->default('pending'); // pending|approved|rejected
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['client_profile_id', 'status']);
            $table->index(['commercial_document_id', 'status']);
        });

        Schema::table('commercial_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('commercial_documents', 'edit_allowed')) {
                $table->boolean('edit_allowed')->default(false)->after('status');
            }
            if (! Schema::hasColumn('commercial_documents', 'converted_document_id')) {
                $table->foreignId('converted_document_id')->nullable()->after('reference_document_id')
                    ->constrained('commercial_documents')->nullOnDelete();
            }
        });

        Schema::table('client_profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('client_profiles', 'amendment_prefix')) {
                $table->string('amendment_prefix', 40)->default('AMD')->after('quotation_prefix');
            }
        });
    }

    public function down(): void
    {
        Schema::table('client_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('client_profiles', 'amendment_prefix')) {
                $table->dropColumn('amendment_prefix');
            }
        });

        Schema::table('commercial_documents', function (Blueprint $table) {
            if (Schema::hasColumn('commercial_documents', 'converted_document_id')) {
                $table->dropConstrainedForeignId('converted_document_id');
            }
            if (Schema::hasColumn('commercial_documents', 'edit_allowed')) {
                $table->dropColumn('edit_allowed');
            }
        });

        Schema::dropIfExists('document_edit_requests');
    }
};
