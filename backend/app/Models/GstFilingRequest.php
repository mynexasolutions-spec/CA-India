<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GstFilingRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_profile_id',
        'financial_year',
        'filing_period',
        'return_type',
        'status',
        'total_bills',
        'taxable_value',
        'total_cgst',
        'total_sgst',
        'total_igst',
        'total_gst',
        'client_declaration',
    ];

    protected $casts = [
        'total_bills' => 'integer',
        'taxable_value' => 'decimal:2',
        'total_cgst' => 'decimal:2',
        'total_sgst' => 'decimal:2',
        'total_igst' => 'decimal:2',
        'total_gst' => 'decimal:2',
        'client_declaration' => 'boolean',
    ];

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function documents()
    {
        return $this->belongsToMany(CommercialDocument::class, 'gst_filing_request_document', 'gst_filing_request_id', 'commercial_document_id')
                    ->withTimestamps();
    }
}
