<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentEditRequest;
use Illuminate\Http\Request;

class DocumentEditRequestController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status', 'pending');
        $q = DocumentEditRequest::with([
            'clientProfile:id,business_name,client_name,client_code',
            'document:id,number,type,status,document_date,grand_total,edit_allowed',
            'submitter:id,name,email',
        ])->latest('id');

        if ($status && $status !== 'all') {
            $q->where('status', $status);
        }
        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('bill_number', 'like', "%{$s}%")
                    ->orWhereHas('clientProfile', fn ($c) => $c->where('business_name', 'like', "%{$s}%")->orWhere('client_name', 'like', "%{$s}%"));
            });
        }

        return response()->json(['data' => $q->paginate(40)]);
    }

    public function show(int $id)
    {
        $req = DocumentEditRequest::with([
            'clientProfile:id,business_name,client_name,client_code',
            'document.customer:id,name,gstin,gst_status',
            'submitter:id,name,email',
            'reviewer:id,name',
        ])->findOrFail($id);

        return response()->json($req);
    }

    public function approve(Request $request, int $id)
    {
        $req = DocumentEditRequest::with('document')->findOrFail($id);
        abort_unless($req->status === 'pending', 422, 'Only pending requests can be approved.');

        $data = $request->validate(['admin_note' => 'nullable|string|max:2000']);

        $req->update([
            'status' => 'approved',
            'admin_note' => $data['admin_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $req->document?->update(['edit_allowed' => true]);

        return response()->json([
            'message' => 'Edit request approved. Client may now edit the document.',
            'request' => $req->fresh(['document', 'clientProfile', 'reviewer']),
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $req = DocumentEditRequest::with('document')->findOrFail($id);
        abort_unless($req->status === 'pending', 422, 'Only pending requests can be rejected.');

        $data = $request->validate(['admin_note' => 'nullable|string|max:2000']);

        $req->update([
            'status' => 'rejected',
            'admin_note' => $data['admin_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);
        $req->document?->update(['edit_allowed' => false]);

        return response()->json([
            'message' => 'Edit request rejected. Client should create an Amendment.',
            'request' => $req->fresh(['document', 'clientProfile', 'reviewer']),
        ]);
    }
}
