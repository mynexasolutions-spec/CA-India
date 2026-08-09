<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = ['user_id','action','subject_type','subject_id','properties','ip_address'];
    protected function casts(): array { return ['properties' => 'array']; }
    public function user() { return $this->belongsTo(User::class); }
}
