<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'client_profile_id', 'name', 'contact_person', 'email', 'phone', 'gstin',
        'state_code', 'state', 'place_of_supply', 'billing_address', 'shipping_address', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }
}
