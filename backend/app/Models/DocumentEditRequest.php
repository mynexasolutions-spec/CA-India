<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentEditRequest extends Model
{
    public const STATUSES = ['pending', 'approved', 'rejected'];

    public const REASONS = [
        'Incorrect GST Rate',
        'Wrong Quantity',
        'Wrong Customer Name',
        'Wrong HSN',
        'Others',
    ];

    public const DOCUMENT_TYPES = ['tax_invoice', 'credit_note', 'debit_note'];

    protected $fillable = [
        'client_profile_id', 'commercial_document_id', 'submitted_by',
        'document_type', 'bill_number', 'reason', 'remarks',
        'status', 'admin_note', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function document()
    {
        return $this->belongsTo(CommercialDocument::class, 'commercial_document_id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
