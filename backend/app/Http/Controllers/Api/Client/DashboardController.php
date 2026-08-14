<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientDocument;
use App\Models\ComplianceTask;
use App\Models\NotificationItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $profile = $request->user()->clientProfile;
        if (!$profile) {
            return response()->json(['message' => 'Client profile not found'], 404);
        }
        $pending = ComplianceTask::where('client_profile_id', $profile->id)
            ->whereIn('status', ['pending', 'in_progress', 'overdue'])->orderBy('due_on')->get();
        $docs = ClientDocument::where('client_profile_id', $profile->id)->where('visibility', 'client')->latest()->limit(10)->get();
        $notices = NotificationItem::where('user_id', $request->user()->id)->latest()->limit(10)->get();

        return response()->json([
            'profile' => $profile,
            'pending_work' => $pending,
            'documents' => $docs,
            'notifications' => $notices,
            'stats' => [
                'pending' => $pending->count(),
                'documents' => ClientDocument::where('client_profile_id', $profile->id)->count(),
                'overdue' => $pending->where('status', 'overdue')->count(),
            ],
        ]);
    }

    public function profile(Request $request)
    {
        return response()->json(['user' => $request->user()->load('clientProfile')]);
    }

    public function updateProfile(Request $request)
    {
        // Legal identity and invoice branding are not directly editable by clients.
        // Branding / bank / invoice settings must go through change-request approval.
        return response()->json([
            'message' => 'Profile updates must be submitted via Billing Settings for administrator approval.',
        ], 403);
    }

    public function uploadLogo(Request $request)
    {
        return response()->json(['message' => 'Use change-request asset upload.'], 403);
    }

    public function uploadSignature(Request $request)
    {
        return response()->json(['message' => 'Use change-request asset upload.'], 403);
    }

    public function uploadSeal(Request $request)
    {
        return response()->json(['message' => 'Use change-request asset upload.'], 403);
    }

    public function uploadQrCode(Request $request)
    {
        return response()->json(['message' => 'Use change-request asset upload.'], 403);
    }

    public function documents(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404);

        return response()->json(
            ClientDocument::where('client_profile_id', $profile->id)->where('visibility', 'client')->latest()->paginate(20)
        );
    }

    public function uploadDocument(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:200',
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx,csv,txt,zip',
        ]);
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404);
        $file = $request->file('file');
        $path = $file->store('client-docs/'.$profile->id, 'public');
        $doc = ClientDocument::create([
            'client_profile_id' => $profile->id,
            'uploaded_by' => $request->user()->id,
            'title' => $request->title,
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'visibility' => 'client',
        ]);
        return response()->json($doc, 201);
    }

    public function downloadDocument(Request $request, int $id)
    {
        $profile = $request->user()->clientProfile;
        $doc = ClientDocument::where('client_profile_id', $profile->id)->findOrFail($id);
        abort_unless(Storage::disk('public')->exists($doc->file_path), 404);
        return response()->json(['url' => '/storage/'.$doc->file_path, 'title' => $doc->title]);
    }

    public function compliance(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404);

        return response()->json(
            ComplianceTask::where('client_profile_id', $profile->id)->orderByDesc('due_on')->paginate(20)
        );
    }
}
