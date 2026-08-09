<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientDocument extends Model
{
    protected $fillable = ['client_profile_id','uploaded_by','title','file_path','file_type','file_size','visibility'];
    public function clientProfile() { return $this->belongsTo(ClientProfile::class); }
}
