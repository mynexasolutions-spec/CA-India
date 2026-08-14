<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Audit Logging Middleware
 *
 * Automatically logs all state-changing (POST/PUT/PATCH/DELETE) requests
 * made by authenticated users. Placed on admin routes to provide a complete
 * audit trail without manually sprinkling ActivityLog::create() calls.
 */
class AuditLog
{
    /** HTTP methods that modify state and should be logged. */
    private const LOGGED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    /** Route patterns to skip (already logged elsewhere or too noisy). */
    private const SKIP_PATTERNS = [
        'api/auth/*',          // login/logout handled by AuthController
        'api/admin/backups/*', // backup runs are noisy
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (
            $request->user() &&
            in_array($request->method(), self::LOGGED_METHODS, true) &&
            $response->isSuccessful() &&
            ! $this->shouldSkip($request)
        ) {
            try {
                ActivityLog::create([
                    'user_id'    => $request->user()->id,
                    'action'     => $this->describeAction($request),
                    'ip_address' => $request->ip(),
                    'metadata'   => json_encode([
                        'method' => $request->method(),
                        'url'    => $request->path(),
                        'status' => $response->getStatusCode(),
                    ]),
                ]);
            } catch (\Throwable $e) {
                // Never break the request if logging fails
                \Illuminate\Support\Facades\Log::warning('Audit log failed: '.$e->getMessage());
            }
        }

        return $response;
    }

    private function shouldSkip(Request $request): bool
    {
        foreach (self::SKIP_PATTERNS as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }

        return false;
    }

    private function describeAction(Request $request): string
    {
        $method = $request->method();
        $path = $request->path();

        // Strip api/ prefix for readability
        $path = preg_replace('#^api/#', '', $path);

        $verb = match ($method) {
            'POST'   => 'Created',
            'PUT', 'PATCH' => 'Updated',
            'DELETE' => 'Deleted',
            default  => $method,
        };

        // Extract the resource name from the path (e.g., "admin/clients/5" → "client #5")
        if (preg_match('#admin/([^/]+)/(\d+)#', $path, $m)) {
            $resource = rtrim($m[1], 's'); // "clients" → "client"
            return "{$verb} {$resource} #{$m[2]}";
        }

        if (preg_match('#admin/([^/]+)$#', $path, $m)) {
            $resource = rtrim($m[1], 's');
            return "{$verb} {$resource}";
        }

        // Billing or client actions
        if (preg_match('#(billing|client)/([^/]+)#', $path, $m)) {
            return "{$verb} {$m[1]}/{$m[2]}";
        }

        return "{$verb} {$path}";
    }
}
