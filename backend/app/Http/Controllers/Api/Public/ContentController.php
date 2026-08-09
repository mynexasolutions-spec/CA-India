<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Category;
use App\Models\DueDate;
use App\Models\Faq;
use App\Models\Testimonial;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    public function articles(Request $request)
    {
        $q = Article::published()->with('category')->latest('published_at');
        if ($request->filled('category')) {
            $q->whereHas('category', fn ($c) => $c->where('slug', $request->category));
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(fn ($w) => $w->where('title', 'like', "%$s%")->orWhere('excerpt', 'like', "%$s%"));
        }
        return response()->json($q->paginate(12));
    }

    public function article(string $slug)
    {
        $article = Article::published()->with(['category', 'author:id,name'])->where('slug', $slug)->firstOrFail();
        $related = Article::published()->where('category_id', $article->category_id)
            ->where('id', '!=', $article->id)->latest('published_at')->limit(3)->get();
        return response()->json(['article' => $article, 'related' => $related]);
    }

    public function categories()
    {
        return response()->json(Category::withCount(['articles' => fn ($q) => $q->published()])->orderBy('sort_order')->get());
    }

    public function dueDates()
    {
        return response()->json(
            DueDate::where('is_active', true)->where('due_on', '>=', now()->subDays(7))->orderBy('due_on')->limit(20)->get()
        );
    }

    public function homeUpdates()
    {
        return response()->json([
            'articles' => Article::published()->latest('published_at')->limit(3)->get(['id','title','slug','excerpt','published_at']),
            'due_dates' => DueDate::where('is_active', true)->where('due_on', '>=', now())->orderBy('due_on')->limit(5)->get(),
        ]);
    }

    public function testimonials()
    {
        return response()->json(Testimonial::where('is_featured', true)->orderBy('sort_order')->get());
    }

    public function faqs(Request $request)
    {
        $q = Faq::where('is_active', true)->orderBy('sort_order');
        if ($request->filled('page')) $q->where('page', $request->page);
        return response()->json($q->get());
    }
}
