<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'portal' => 'nullable|in:admin,client',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password) || !$user->is_active) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }

        $portal = $data['portal'] ?? 'admin';
        if ($portal === 'admin' && !$user->isStaff()) {
            throw ValidationException::withMessages(['email' => ['Not authorized for admin portal.']]);
        }
        if ($portal === 'client' && ! $user->isClient()) {
            throw ValidationException::withMessages(['email' => ['Not authorized for client portal.']]);
        }

        $user->update(['last_login_at' => now()]);
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'ip_address' => $request->ip(),
        ]);

        $token = $user->createToken($portal . '-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        \Illuminate\Support\Facades\Cache::forget(
            \App\Http\Controllers\Api\Admin\ClientsUnlockController::cacheKey($request->user()->id)
        );
        return response()->json(['message' => 'Logged out']);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);
        $user = User::where('email', $data['email'])->first();
        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );
            try {
                Mail::raw("Reset your password using this token on the portal:\n\n$token\n\nOr contact the firm for assistance.", function ($m) use ($user) {
                    $m->to($user->email)->subject('Password reset - A B KHAN & ASSOCIATES');
                });
            } catch (\Throwable $e) {}
        }
        return response()->json(['message' => 'If the email exists, a reset link has been sent.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);
        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();
        if (!$row || !Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['email' => ['Invalid or expired reset token.']]);
        }
        $user = User::where('email', $data['email'])->firstOrFail();
        $user->update(['password' => Hash::make($data['password'])]);
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
        return response()->json(['message' => 'Password updated. You can sign in now.']);
    }

    /** Change password while logged in (Admin or Client portal). */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Current password is incorrect.']]);
        }

        $user->update(['password' => Hash::make($data['password'])]);
        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'changed_password',
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    private function userPayload(User $user): array
    {
        $user->load('clientProfile');
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'phone' => $user->phone,
            'client_profile' => $user->clientProfile,
        ];
    }
}
