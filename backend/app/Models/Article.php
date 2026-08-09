<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'category_id','author_id','title','slug','excerpt','body','featured_image',
        'status','published_at','meta_title','meta_description',
    ];
    protected function casts(): array { return ['published_at' => 'datetime']; }
    public function category() { return $this->belongsTo(Category::class); }
    public function author() { return $this->belongsTo(User::class, 'author_id'); }
    public function scopePublished($q) {
        return $q->where('status','published')->whereNotNull('published_at')->where('published_at','<=',now());
    }
}
