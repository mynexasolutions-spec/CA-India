<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientGstr2bInvoice extends Model
{
    public const MATCH_STATUS_MATCHED = 'matched';

    public const MATCH_STATUS_UNMATCHED = 'unmatched';

    public const MATCH_STATUSES = [
        self::MATCH_STATUS_MATCHED,
        self::MATCH_STATUS_UNMATCHED,
    ];

    protected $fillable = [
        'client_profile_id', 'gstr2b_record_id', 'financial_year', 'tax_period',
        'supplier_gstin', 'supplier_name', 'invoice_number', 'invoice_date', 'invoice_value',
        'taxable_value', 'cgst', 'sgst', 'igst', 'cess', 'total_gst',
        'itc_eligibility', 'itc_reason', 'match_status',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
        ];
    }

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function record()
    {
        return $this->belongsTo(ClientGstr2bRecord::class, 'gstr2b_record_id');
    }
}
