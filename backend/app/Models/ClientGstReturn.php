<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientGstReturn extends Model
{
    public const TYPE_GSTR1 = 'GSTR1';
    public const TYPE_GSTR3B = 'GSTR3B';
    public const TYPE_CMP08 = 'CMP08';
    public const TYPES = [self::TYPE_GSTR1, self::TYPE_GSTR3B, self::TYPE_CMP08];

    protected $fillable = [
        'client_profile_id',
        'tax_period',
        'return_type',
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
