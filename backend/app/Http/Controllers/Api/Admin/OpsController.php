<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientDocument;
use App\Models\ClientProfile;
use App\Models\ComplianceTask;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class OpsController extends Controller
{
    public function uploadClientDocument(Request $request)
    {
        $data = $request->validate([
            'client_profile_id' => 'required|exists:client_profiles,id',
            'title' => 'required|string|max:200',
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx,csv,txt,zip',
            'visibility' => 'nullable|in:client,internal',
        ]);
        $file = $request->file('file');
        $path = $file->store('client-docs/'.$data['client_profile_id'], 'public');
        $doc = ClientDocument::create([
            'client_profile_id' => $data['client_profile_id'],
            'uploaded_by' => $request->user()->id,
            'title' => $data['title'],
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'visibility' => $data['visibility'] ?? 'client',
        ]);
        return response()->json($doc, 201);
    }

    public function assignCompliance(Request $request)
    {
        $data = $request->validate([
            'client_profile_id' => 'required|exists:client_profiles,id',
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'due_on' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'status' => 'nullable|in:pending,in_progress,completed,overdue',
        ]);
        $task = ComplianceTask::create([
            ...$data,
            'status' => $data['status'] ?? 'pending',
        ]);
        return response()->json($task->load(['clientProfile', 'assignee:id,name']), 201);
    }

    public function runBackup()
    {
        Artisan::call('backup:run');
        $dir = storage_path('app/backups');
        $files = collect(File::files($dir))->sortByDesc(fn ($f) => $f->getMTime())->take(10)->map(fn ($f) => [
            'name' => $f->getFilename(),
            'size' => $f->getSize(),
            'modified' => date('c', $f->getMTime()),
        ])->values();
        return response()->json(['message' => Artisan::output(), 'files' => $files]);
    }

    public function backups()
    {
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);
        $files = collect(File::files($dir))->sortByDesc(fn ($f) => $f->getMTime())->map(fn ($f) => [
            'name' => $f->getFilename(),
            'size' => $f->getSize(),
            'modified' => date('c', $f->getMTime()),
        ])->values();
        return response()->json(['files' => $files]);
    }
}
