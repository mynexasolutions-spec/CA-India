<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureClient
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user || ! $user->isClient()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if (! $user->clientProfile) {
            return response()->json(['message' => 'Client profile not found'], 403);
        }

        return $next($request);
    }
}
