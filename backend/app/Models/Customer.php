<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'client_profile_id', 'name', 'proprietor_name', 'contact_person', 'email', 'phone', 'gstin', 'gst_status',
        'state_code', 'state', 'place_of_supply', 'billing_address', 'shipping_address', 'is_active',
    ];

    protected $appends = ['gstin_display'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function clientProfile()
    {
        return $this->belongsTo(ClientProfile::class);
    }

    public function getGstinDisplayAttribute(): string
    {
        return $this->gst_status === 'registered' && $this->gstin ? $this->gstin : 'Unregistered';
    }
}
