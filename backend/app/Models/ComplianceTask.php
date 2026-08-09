<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComplianceTask extends Model
{
    protected $fillable = ['client_profile_id','assigned_to','title','description','status','due_on','completed_at'];
    protected function casts(): array { return ['due_on' => 'date', 'completed_at' => 'datetime']; }
    public function clientProfile() { return $this->belongsTo(ClientProfile::class); }
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
}
