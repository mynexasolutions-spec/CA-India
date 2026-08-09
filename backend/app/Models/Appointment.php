<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = ['name','phone','email','service','preferred_at','notes','status','assigned_to'];
    protected function casts(): array { return ['preferred_at' => 'datetime']; }
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
}
