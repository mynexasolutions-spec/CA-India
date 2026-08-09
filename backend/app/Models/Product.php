<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'client_profile_id','name','sku','hsn_sac','gst_rate','unit','sale_price','description','is_active',
    ];
    protected function casts(): array {
        return ['gst_rate' => 'decimal:2', 'sale_price' => 'decimal:2', 'is_active' => 'boolean'];
    }
}
