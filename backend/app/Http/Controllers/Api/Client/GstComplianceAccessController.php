<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Supports the "GST Compliance Not Subscribed" popup — surfaced when a client without
 * the GST Compliance add-on hits a gated route (see EnsureGstComplianceSubscribed).
 * Not gated itself: a client needs this even while locked out of GST Compliance proper.
 */
class GstComplianceAccessController extends Controller
{
    /** Whoever the client should contact — the firm's admin/super_admin account,
     *  looked up dynamically rather than a hardcoded address. */
    public function adminContact(Request $request)
    {
        $admin = User::whereIn('role', ['super_admin', 'admin'])
            ->where('is_active', true)
            ->orderByRaw("CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END")
            ->first(['name', 'email', 'phone']);

        return response()->json($admin ?: ['name' => null, 'email' => null, 'phone' => null]);
    }

    /** Logs a visible request in the Admin activity log — so "Request Access" does
     *  something real rather than being a decorative button. */
    public function requestAccess(Request $request)
    {
        $user = $request->user();
        $profile = $user->clientProfile;
        abort_unless($profile, 403);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'gst_compliance_access_requested',
            'subject_type' => 'ClientProfile',
            'subject_id' => $profile->id,
            'properties' => [
                'business_name' => $profile->business_name,
                'client_code' => $profile->client_code,
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Your request has been sent to the Admin.']);
    }
}
