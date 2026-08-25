<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Gates GSTR-2B, GST Returns, and GST Filing Confirmation behind the client's
 * subscription — a separate add-on from core Billing (see gst_compliance_enabled on
 * ClientProfile). Blocked requests get a distinguishable payload so the frontend can
 * show the "GST Compliance Not Subscribed" popup instead of a generic error.
 */
class EnsureGstComplianceSubscribed
{
    public function handle(Request $request, Closure $next)
    {
        $profile = $request->user()?->clientProfile;

        if ($profile && ! $profile->gst_compliance_enabled) {
            return response()->json([
                'gst_compliance_locked' => true,
                'message' => 'GST Compliance is not included in your current subscription. Your current subscription provides access to Billing services only.',
            ], 403);
        }

        return $next($request);
    }
}
