<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientGstReturn;
use Illuminate\Http\Request;

class GstReturnController extends Controller
{
    public function index(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404, 'Profile not found');
        abort_unless($profile->has_gst, 400, 'GST is not enabled on this profile');

        $returns = ClientGstReturn::where('client_profile_id', $profile->id)
            ->orderByDesc('tax_period')
            ->get();

        $lastFiled = $returns->firstWhere('status', 'filed');

        return response()->json([
            'last_filed' => $lastFiled ? $lastFiled->tax_period : null,
            'frequency' => $profile->gst_filing_frequency ?? 'monthly',
            'dealer_type' => $profile->dealer_type,
            'returns' => $returns,
        ]);
    }
}
