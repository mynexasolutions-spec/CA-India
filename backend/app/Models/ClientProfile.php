<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientProfile extends Model
{
    protected $fillable = [
        'user_id', 'client_code', 'client_name', 'business_name', 'constitution_type', 'business_type',
        'date_of_incorporation', 'date_of_birth', 'mobile', 'alt_mobile', 'alt_email',
        'gstin', 'has_gst', 'gst_compliance_enabled', 'dealer_type', 'composition_rate', 'gst_filing_frequency', 'gstr1_filing_frequency', 'gstr2b_filing_frequency', 'pan', 'email', 'state_code', 'state', 'country', 'place_of_supply_default',
        'address', 'city', 'pincode', 'website',
        'aadhaar', 'gst_portal_username', 'gst_portal_password', 'tan', 'tan_portal_password',
        'it_portal_password', 'udyam', 'shop_establishment', 'iec', 'cin', 'llpin', 'pt_reg', 'esic', 'pf',
        'bank_name', 'bank_branch', 'bank_account', 'account_holder_name', 'bank_ifsc',
        'swift_code', 'account_type', 'upi_id', 'qr_code_path',
        'logo_path', 'signature_path', 'seal_path', 'signatory_name', 'terms_conditions',
        'invoice_prefix', 'bill_of_supply_prefix', 'credit_note_prefix', 'debit_note_prefix',
        'quotation_prefix', 'amendment_prefix',
        'invoice_next_number', 'bill_of_supply_next_number', 'credit_note_next_number',
        'debit_note_next_number', 'quotation_next_number', 'amendment_next_number',
    ];

    protected function casts(): array
    {
        return [
            'date_of_incorporation' => 'date',
            'date_of_birth' => 'date',
            'has_gst' => 'boolean',
            'gst_compliance_enabled' => 'boolean',
            'composition_rate' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function documents()
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function clientDocuments()
    {
        return $this->hasMany(ClientDocument::class);
    }

    public function gstr2bRecords()
    {
        return $this->hasMany(ClientGstr2bRecord::class);
    }

    public function gstReturns()
    {
        return $this->hasMany(ClientGstReturn::class);
    }

    public function complianceTasks()
    {
        return $this->hasMany(ComplianceTask::class);
    }

    public function changeRequests()
    {
        return $this->hasMany(ClientChangeRequest::class);
    }
}
