<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TdsTcsSection extends Model
{
    protected $fillable = ['type', 'code', 'description', 'rate', 'is_active', 'sort_order'];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }
}
