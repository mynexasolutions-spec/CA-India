<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\CommercialDocument;
use App\Models\DocumentEditRequest;
use Illuminate\Http\Request;

class DocumentEditRequestController extends Controller
{
    private function profile(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 403);

        return $profile;
    }

    public function index(Request $request)
    {
        $status = $request->input('status', 'all');
        $q = DocumentEditRequest::where('client_profile_id', $this->profile($request)->id)
            ->with(['document:id,number,type,status,document_date,grand_total,customer_id,edit_allowed', 'document.customer:id,name,gstin,gst_status'])
            ->latest('id');

        if ($status && $status !== 'all') {
            $q->where('status', $status);
        }

        return response()->json(['data' => $q->paginate(25)]);
    }

    public function lookup(Request $request)
    {
        $data = $request->validate([
            'document_type' => 'required|in:tax_invoice,credit_note,debit_note',
            'bill_number' => 'required|string|max:80',
        ]);
        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)
            ->where('type', $data['document_type'])
            ->where('number', $data['bill_number'])
            ->with('customer:id,name,gstin,gst_status')
            ->first();

        abort_unless($doc, 404, 'Document not found.');
        abort_unless(in_array($doc->status, ['issued', 'paid', 'partial'], true), 422, 'Only issued documents can be requested for edit.');

        return response()->json([
            'id' => $doc->id,
            'bill_number' => $doc->number,
            'document_date' => $doc->document_date,
            'customer_name' => $doc->customer?->name,
            'gstin' => $doc->customer?->gstin_display,
            'amount' => $doc->grand_total ?: $doc->total_amount,
            'status' => $doc->status,
            'type' => $doc->type,
            'edit_allowed' => (bool) $doc->edit_allowed,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'document_type' => 'required|in:tax_invoice,credit_note,debit_note',
            'bill_number' => 'required|string|max:80',
            'reason' => 'required|string|max:80',
            'remarks' => 'nullable|string|max:2000',
        ]);

        $profile = $this->profile($request);
        $doc = CommercialDocument::where('client_profile_id', $profile->id)
            ->where('type', $data['document_type'])
            ->where('number', $data['bill_number'])
            ->first();

        abort_unless($doc, 404, 'Document not found.');
        abort_unless(in_array($doc->status, ['issued', 'paid', 'partial'], true), 422, 'Only issued documents can be requested for edit.');
        abort_if($doc->edit_allowed, 422, 'This document is already unlocked for editing.');

        $pending = DocumentEditRequest::where('commercial_document_id', $doc->id)
            ->where('status', 'pending')
            ->exists();
        abort_if($pending, 422, 'An edit request is already pending for this document.');

        $req = DocumentEditRequest::create([
            'client_profile_id' => $profile->id,
            'commercial_document_id' => $doc->id,
            'submitted_by' => $request->user()->id,
            'document_type' => $doc->type,
            'bill_number' => $doc->number,
            'reason' => $data['reason'],
            'remarks' => $data['remarks'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Your edit request has been submitted successfully.',
            'request' => $req->fresh(['document.customer']),
        ], 201);
    }
}
