<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientChangeRequest extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const TEXT_FIELDS = [
        'bank_name',
        'bank_branch',
        'account_holder_name',
        'bank_account',
        'bank_ifsc',
        'swift_code',
        'account_type',
        'upi_id',
        'signatory_name',
        'invoice_prefix',
        'bill_of_supply_prefix',
        'credit_note_prefix',
        'debit_note_prefix',
        'quotation_prefix',
        'terms_conditions',
    ];

    public const ASSET_FIELDS = [
        'logo' => 'logo_path',
        'signature' => 'signature_path',
        'seal' => 'seal_path',
        'qr_code' => 'qr_code_path',
    ];

    protected $fillable = [
        'client_profile_id',
        'submitted_by',
        'status',
        'payload',
        'logo_path',
        'signature_path',
        'seal_path',
        'qr_code_path',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
