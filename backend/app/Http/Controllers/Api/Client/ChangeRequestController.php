<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientChangeRequest;
use App\Models\ClientProfile;
use Illuminate\Http\Request;

class ChangeRequestController extends Controller
{
    private function profile(Request $request): ClientProfile
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404, 'Client profile not found');

        return $profile;
    }

    private function approvedSnapshot(ClientProfile $profile): array
    {
        $text = [];
        foreach (ClientChangeRequest::TEXT_FIELDS as $field) {
            $text[$field] = $profile->{$field};
        }

        return [
            'text' => $text,
            'logo_path' => $profile->logo_path,
            'signature_path' => $profile->signature_path,
            'seal_path' => $profile->seal_path,
            'qr_code_path' => $profile->qr_code_path,
        ];
    }

    private function serializeRequest(?ClientChangeRequest $req): ?array
    {
        if (! $req) {
            return null;
        }

        return [
            'id' => $req->id,
            'section' => $req->section,
            'status' => $req->status,
            'payload' => $req->payload ?? [],
            'logo_path' => $req->logo_path,
            'signature_path' => $req->signature_path,
            'seal_path' => $req->seal_path,
            'qr_code_path' => $req->qr_code_path,
            'admin_note' => $req->admin_note,
            'reviewed_at' => $req->reviewed_at,
            'created_at' => $req->created_at,
            'updated_at' => $req->updated_at,
        ];
    }

    /**
     * Every Settings tab (branding / bank / invoice_settings / numbering) tracks its own
     * independent pending + last-reviewed request, so one tab can show "Pending Approval"
     * while another simultaneously shows "Approved" — not one shared status for the whole page.
     */
    public function current(Request $request)
    {
        $profile = $this->profile($request);

        $sections = [];
        foreach (ClientChangeRequest::SECTIONS as $section) {
            $pending = ClientChangeRequest::where('client_profile_id', $profile->id)
                ->where('section', $section)
                ->where('status', ClientChangeRequest::STATUS_PENDING)
                ->latest('id')
                ->first();
            $last = ClientChangeRequest::where('client_profile_id', $profile->id)
                ->where('section', $section)
                ->whereIn('status', [ClientChangeRequest::STATUS_APPROVED, ClientChangeRequest::STATUS_REJECTED])
                ->latest('id')
                ->first();

            $sections[$section] = [
                'pending' => $this->serializeRequest($pending),
                'last_reviewed' => $this->serializeRequest($last),
            ];
        }

        return response()->json([
            'approved' => $this->approvedSnapshot($profile),
            'sections' => $sections,
        ]);
    }

    /** Full change-request history across all sections, for the "View Request History" page. */
    public function history(Request $request)
    {
        $profile = $this->profile($request);
        $q = ClientChangeRequest::where('client_profile_id', $profile->id)->latest('id');

        if ($request->filled('section') && in_array($request->section, ClientChangeRequest::SECTIONS, true)) {
            $q->where('section', $request->section);
        }

        $page = $q->paginate(20);
        $page->getCollection()->transform(fn ($req) => $this->serializeRequest($req));

        return response()->json($page);
    }

    private function validationRules(): array
    {
        return [
            'bank_name' => 'nullable|string|max:120',
            'bank_branch' => 'nullable|string|max:120',
            'account_holder_name' => 'nullable|string|max:120',
            'bank_account' => 'nullable|string|max:60',
            'bank_ifsc' => 'nullable|string|max:20',
            'swift_code' => 'nullable|string|max:30',
            'account_type' => 'nullable|string|max:40',
            'upi_id' => 'nullable|string|max:120',
            'signatory_name' => 'nullable|string|max:120',
            'invoice_prefix' => 'nullable|string|max:40',
            'bill_of_supply_prefix' => 'nullable|string|max:40',
            'credit_note_prefix' => 'nullable|string|max:40',
            'debit_note_prefix' => 'nullable|string|max:40',
            'quotation_prefix' => 'nullable|string|max:40',
            'terms_conditions' => 'nullable|string',
        ];
    }

    public function store(Request $request)
    {
        $profile = $this->profile($request);

        $data = $request->validate(array_merge($this->validationRules(), [
            'section' => 'required|string|in:'.implode(',', ClientChangeRequest::SECTIONS),
        ]));
        $section = $data['section'];
        unset($data['section']);

        // Only accept fields that actually belong to this section — a bank-tab submit can't
        // sneak in a numbering-prefix change, even if the client sent one.
        $payload = [];
        foreach ($data as $field => $value) {
            if ((ClientChangeRequest::FIELD_SECTIONS[$field] ?? null) === $section) {
                $payload[$field] = $value;
            }
        }

        $pending = ClientChangeRequest::where('client_profile_id', $profile->id)
            ->where('section', $section)
            ->where('status', ClientChangeRequest::STATUS_PENDING)
            ->latest('id')
            ->first();

        if ($pending) {
            $merged = array_merge($pending->payload ?? [], $payload);
            $pending->update([
                'payload' => $merged,
                'submitted_by' => $request->user()->id,
            ]);
        } else {
            $pending = ClientChangeRequest::create([
                'client_profile_id' => $profile->id,
                'section' => $section,
                'submitted_by' => $request->user()->id,
                'status' => ClientChangeRequest::STATUS_PENDING,
                'payload' => $payload,
            ]);
        }

        return response()->json([
            'message' => 'Change request submitted for approval',
            'pending' => $this->serializeRequest($pending->fresh()),
            'approved' => $this->approvedSnapshot($profile),
        ], $pending->wasRecentlyCreated ? 201 : 200);
    }

    public function uploadAsset(Request $request, string $field)
    {
        abort_unless(array_key_exists($field, ClientChangeRequest::ASSET_FIELDS), 404);

        $column = ClientChangeRequest::ASSET_FIELDS[$field];
        $max = $field === 'logo' ? 4096 : 2048;
        $request->validate([$field => "required|image|max:{$max}"]);

        $profile = $this->profile($request);
        $pending = ClientChangeRequest::where('client_profile_id', $profile->id)
            ->where('section', ClientChangeRequest::SECTION_BRANDING)
            ->where('status', ClientChangeRequest::STATUS_PENDING)
            ->latest('id')
            ->first();

        if (! $pending) {
            $pending = ClientChangeRequest::create([
                'client_profile_id' => $profile->id,
                'section' => ClientChangeRequest::SECTION_BRANDING,
                'submitted_by' => $request->user()->id,
                'status' => ClientChangeRequest::STATUS_PENDING,
                'payload' => [],
            ]);
        }

        $path = $request->file($field)->store("change-requests/{$pending->id}", 'public');
        $pending->update([
            $column => $path,
            'submitted_by' => $request->user()->id,
        ]);

        return response()->json([
            $column => $path,
            'url' => '/storage/'.$path,
            'pending' => $this->serializeRequest($pending->fresh()),
        ]);
    }
}
