<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientGstr2bRecord extends Model
{
    protected $fillable = [
        'client_profile_id', 'financial_year', 'tax_period',
        'file_path', 'file_name', 'file_type', 'file_size', 'uploaded_by',
    ];

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function invoices()
    {
        return $this->hasMany(ClientGstr2bInvoice::class, 'gstr2b_record_id');
    }
}
