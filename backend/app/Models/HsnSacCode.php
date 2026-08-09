<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HsnSacCode extends Model
{
    protected $fillable = ['type', 'code', 'description', 'code_length'];

    public function getLabelAttribute(): string
    {
        return $this->code.' — '.$this->description;
    }
}
