<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DueDate extends Model
{
    protected $fillable = ['title','type','due_on','description','is_active'];
    protected function casts(): array { return ['due_on' => 'date', 'is_active' => 'boolean']; }
}
