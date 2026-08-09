<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    protected $fillable = ['name','role','company','content','rating','avatar_initials','is_featured','sort_order'];
    protected function casts(): array { return ['is_featured' => 'boolean']; }
}
