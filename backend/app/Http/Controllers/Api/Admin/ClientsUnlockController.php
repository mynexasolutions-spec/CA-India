<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class ClientsUnlockController extends Controller
{
    public const CACHE_MINUTES = 60;

    public static function cacheKey(int $userId): string
    {
        return "admin_clients_unlock_{$userId}";
    }

    public static function isUnlocked(int $userId): bool
    {
        return (bool) Cache::get(self::cacheKey($userId));
    }

    public function status(Request $request)
    {
        $unlocked = self::isUnlocked($request->user()->id);

        return response()->json([
            'unlocked' => $unlocked,
            'expires_in_minutes' => $unlocked ? self::CACHE_MINUTES : 0,
        ]);
    }

    public function unlock(Request $request)
    {
        $data = $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();
        if (! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid administrator password.'], 422);
        }

        Cache::put(self::cacheKey($user->id), now()->toIso8601String(), now()->addMinutes(self::CACHE_MINUTES));

        return response()->json([
            'unlocked' => true,
            'expires_in_minutes' => self::CACHE_MINUTES,
            'message' => 'Clients module unlocked.',
        ]);
    }

    public function lock(Request $request)
    {
        Cache::forget(self::cacheKey($request->user()->id));

        return response()->json(['unlocked' => false]);
    }
}
