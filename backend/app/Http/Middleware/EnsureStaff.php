<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureStaff
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || !$user->isStaff()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return $next($request);
    }
}
