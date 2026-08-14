<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GstFilingRequest;
use Illuminate\Http\Request;

class GstFilingController extends Controller
{
    public function index()
    {
        $requests = GstFilingRequest::with('clientProfile.user')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($requests);
    }

    public function show($id)
    {
        $filingRequest = GstFilingRequest::with(['clientProfile.user', 'documents'])
            ->findOrFail($id);
            
        return response()->json($filingRequest);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:Pending CA Review,Approved for Filing,Correction Required,GST Filed',
        ]);

        $filingRequest = GstFilingRequest::findOrFail($id);
        $filingRequest->status = $request->status;
        $filingRequest->save();

        return response()->json([
            'message' => 'Status updated successfully.',
            'request' => $filingRequest
        ]);
    }
}
