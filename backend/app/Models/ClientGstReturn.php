<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientGstReturn extends Model
{
    protected $fillable = [
        'client_profile_id',
        'tax_period',
        'status',
        'filed_on',
        'filed_by',
    ];

    protected function casts(): array
    {
        return [
            'filed_on' => 'datetime',
        ];
    }

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function filer()
    {
        return $this->belongsTo(User::class, 'filed_by');
    }
}
