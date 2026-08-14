<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\User;
use App\Services\Billing\BillingPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class ClientProfileController extends Controller
{
    private const ENCRYPTED = ['gst_portal_password', 'tan_portal_password', 'it_portal_password'];

    private function assertClientsUnlocked(Request $request): void
    {
        abort_unless(
            ClientsUnlockController::isUnlocked($request->user()->id),
            403,
            'Clients module is locked. Enter your administrator password to continue.'
        );
    }

    public function index(Request $request)
    {
        $this->assertClientsUnlocked($request);
        $q = ClientProfile::with('user:id,name,email,phone,role,is_active,created_at');

        if ($request->filled('status')) {
            $active = $request->status === 'active';
            $q->whereHas('user', fn ($u) => $u->where('is_active', $active));
        }
        if ($request->filled('constitution_type')) {
            $q->where('constitution_type', $request->constitution_type);
        }
        if ($request->filled('registration_type')) {
            match ($request->registration_type) {
                'gst' => $q->whereNotNull('gstin')->where('gstin', '!=', ''),
                'pan' => $q->whereNotNull('pan')->where('pan', '!=', ''),
                'tan' => $q->whereNotNull('tan')->where('tan', '!=', ''),
                'udyam' => $q->whereNotNull('udyam')->where('udyam', '!=', ''),
                default => null,
            };
        }
        if ($request->filled('registered_from')) {
            $q->whereDate('created_at', '>=', $request->registered_from);
        }
        if ($request->filled('registered_to')) {
            $q->whereDate('created_at', '<=', $request->registered_to);
        }
        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('client_name', 'like', "%{$s}%")
                    ->orWhere('business_name', 'like', "%{$s}%")
                    ->orWhere('client_code', 'like', "%{$s}%")
                    ->orWhere('pan', 'like', "%{$s}%")
                    ->orWhere('gstin', 'like', "%{$s}%")
                    ->orWhere('tan', 'like', "%{$s}%")
                    ->orWhere('mobile', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"));
            });
        }

        $sort = $request->input('sort', 'created_at');
        $dir = $request->input('dir', 'desc');
        $allowed = ['client_name', 'business_name', 'client_code', 'created_at', 'updated_at'];
        if (in_array($sort, $allowed, true)) {
            $q->orderBy($sort, $dir === 'asc' ? 'asc' : 'desc');
        } else {
            $q->latest();
        }

        return response()->json($q->paginate(25));
    }

    /** Lightweight client directory for Admin Billing picker (no clients-unlock required). */
    public function billingDirectory(Request $request)
    {
        $q = ClientProfile::query()
            ->select(['id', 'business_name', 'client_name', 'client_code', 'gstin', 'has_gst', 'dealer_type', 'user_id'])
            ->with('user:id,email,is_active')
            ->latest();

        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('business_name', 'like', "%{$s}%")
                    ->orWhere('client_name', 'like', "%{$s}%")
                    ->orWhere('client_code', 'like', "%{$s}%")
                    ->orWhere('gstin', 'like', "%{$s}%");
            });
        }

        return response()->json($q->paginate(50));
    }

    public function show(Request $request, int $id)
    {
        $this->assertClientsUnlocked($request);
        $profile = ClientProfile::with('user:id,name,email,phone,role,is_active')->findOrFail($id);
        $data = $profile->toArray();
        foreach (self::ENCRYPTED as $field) {
            if (! empty($data[$field])) {
                try {
                    $data[$field] = Crypt::decryptString($data[$field]);
                } catch (\Throwable) {
                    $data[$field] = null;
                }
            }
        }

        return response()->json($data);
    }

    /**
     * Permanently delete a client company and related billing data.
     * Available from Admin Settings (password confirmation required; Clients unlock not required).
     */
    public function destroy(Request $request, int $id)
    {
        $data = $request->validate([
            'password' => 'required|string',
            'confirm_name' => 'required|string',
        ]);

        if (! Hash::check($data['password'], $request->user()->password)) {
            return response()->json(['message' => 'Administrator password is incorrect.'], 422);
        }

        $profile = ClientProfile::with('user')->findOrFail($id);
        $expected = trim((string) ($profile->business_name ?: $profile->client_name));
        abort_unless(
            strcasecmp(trim($data['confirm_name']), $expected) === 0,
            422,
            'Company name confirmation does not match.'
        );

        return DB::transaction(function () use ($request, $profile) {
            $userId = $profile->user_id;
            $profileId = $profile->id;

            // Break self-references on commercial documents first
            CommercialDocument::where('client_profile_id', $profileId)->update([
                'converted_document_id' => null,
                'reference_document_id' => null,
            ]);

            $docIds = CommercialDocument::where('client_profile_id', $profileId)->pluck('id');
            if ($docIds->isNotEmpty()) {
                DB::table('document_line_items')->whereIn('commercial_document_id', $docIds)->delete();
                if (DB::getSchemaBuilder()->hasTable('document_edit_requests')) {
                    DB::table('document_edit_requests')->whereIn('commercial_document_id', $docIds)->delete();
                }
                CommercialDocument::where('client_profile_id', $profileId)->delete();
            }

            if (DB::getSchemaBuilder()->hasTable('client_change_requests')) {
                DB::table('client_change_requests')->where('client_profile_id', $profileId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('document_edit_requests')) {
                DB::table('document_edit_requests')->where('client_profile_id', $profileId)->delete();
            }

            DB::table('customers')->where('client_profile_id', $profileId)->delete();
            DB::table('products')->where('client_profile_id', $profileId)->delete();
            if (DB::getSchemaBuilder()->hasTable('client_documents')) {
                DB::table('client_documents')->where('client_profile_id', $profileId)->delete();
            }
            if (DB::getSchemaBuilder()->hasTable('compliance_tasks')) {
                DB::table('compliance_tasks')->where('client_profile_id', $profileId)->delete();
            }

            foreach (['logo_path', 'signature_path', 'seal_path', 'qr_code_path'] as $asset) {
                if (! empty($profile->{$asset}) && Storage::disk('public')->exists($profile->{$asset})) {
                    Storage::disk('public')->delete($profile->{$asset});
                }
            }
            Storage::disk('public')->deleteDirectory('invoices/'.$profileId);

            $profile->delete();

            if ($userId) {
                DB::table('personal_access_tokens')->where('tokenable_id', $userId)->where('tokenable_type', User::class)->delete();
                User::where('id', $userId)->where('role', 'client')->delete();
            }

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'deleted_client',
                'subject_type' => ClientProfile::class,
                'subject_id' => $profileId,
                'ip_address' => $request->ip(),
            ]);

            return response()->json(['message' => 'Company deleted permanently.']);
        });
    }

    public function store(Request $request)
    {
        $this->assertClientsUnlocked($request);
        $data = $this->validatePayload($request, true);
        return DB::transaction(function () use ($request, $data) {
            $user = User::create([
                'name' => $data['client_name'] ?? $data['business_name'] ?? 'Client',
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'phone' => $data['mobile'] ?? $data['phone'] ?? null,
                'role' => 'client',
                'is_active' => $data['is_active'] ?? true,
            ]);

            $profileData = $this->profileFields($data);
            $profileData['user_id'] = $user->id;
            $profileData['client_code'] = $data['client_code'] ?? $this->nextClientCode();
            $profile = ClientProfile::create($profileData);
            $this->handleUploads($request, $profile);

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'created_client',
                'subject_type' => ClientProfile::class,
                'subject_id' => $profile->id,
                'ip_address' => $request->ip(),
            ]);

            return response()->json($profile->fresh()->load('user'), 201);
        });
    }

    public function update(Request $request, int $id)
    {
        $this->assertClientsUnlocked($request);
        $profile = ClientProfile::with('user')->findOrFail($id);
        $data = $this->validatePayload($request, false, $profile);

        return DB::transaction(function () use ($request, $data, $profile) {
            if (isset($data['client_name']) || isset($data['mobile']) || isset($data['email']) || isset($data['password']) || isset($data['is_active'])) {
                $userUpdate = array_filter([
                    'name' => $data['client_name'] ?? null,
                    'email' => $data['email'] ?? null,
                    'phone' => $data['mobile'] ?? null,
                    'is_active' => $data['is_active'] ?? null,
                ], fn ($v) => $v !== null);
                if (! empty($data['password'])) {
                    $userUpdate['password'] = Hash::make($data['password']);
                }
                if ($userUpdate) {
                    $profile->user->update($userUpdate);
                }
            }

            $profile->update($this->profileFields($data, $profile));
            $this->handleUploads($request, $profile);

            return response()->json($profile->fresh()->load('user'));
        });
    }

    public function billingDashboard(Request $request, int $id)
    {
        $profile = ClientProfile::findOrFail($id);
        [$from, $to] = $this->dateRange($request);

        $base = CommercialDocument::where('client_profile_id', $profile->id)
            ->whereBetween('document_date', [$from, $to])
            ->where('status', 'issued')
            ->when($request->filled('document_type') && $request->document_type !== 'all', fn ($q) => $q->where('type', $request->document_type))
            ->when($request->filled('invoice_number'), fn ($q) => $q->where('number', 'like', '%'.$request->invoice_number.'%'))
            ->when($request->filled('hsn_sac'), function ($q) use ($request) {
                $q->whereHas('lineItems', fn ($li) => $li->where('hsn_sac', 'like', '%'.$request->hsn_sac.'%'));
            });

        $sum = fn ($type = null) => (clone $base)->when($type, fn ($q) => $q->where('type', $type));

        $monthly = (clone $base)
            ->selectRaw('DATE_FORMAT(document_date, "%Y-%m") as month,
                SUM(CASE WHEN type = "tax_invoice" THEN 1 ELSE 0 END) as tax_invoices,
                SUM(CASE WHEN type = "bill_of_supply" THEN 1 ELSE 0 END) as bill_of_supply,
                SUM(CASE WHEN type = "debit_note" THEN 1 ELSE 0 END) as debit_notes,
                SUM(CASE WHEN type = "credit_note" THEN 1 ELSE 0 END) as credit_notes,
                COUNT(*) as total_documents,
                SUM(taxable_amount) as taxable,
                SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total,
                SUM(cgst_amount) as cgst,
                SUM(sgst_amount) as sgst,
                SUM(igst_amount) as igst,
                SUM(cgst_amount+sgst_amount+igst_amount) as gst')
            ->groupBy('month')->orderBy('month')->get();

        $hsn = DB::table('document_line_items as li')
            ->join('commercial_documents as d', 'd.id', '=', 'li.commercial_document_id')
            ->where('d.client_profile_id', $profile->id)
            ->whereBetween('d.document_date', [$from, $to])
            ->where('d.status', 'issued')
            ->select(
                'li.hsn_sac',
                DB::raw('MAX(li.description) as description'),
                DB::raw('MAX(li.unit) as uqc'),
                DB::raw('SUM(li.qty) as qty'),
                DB::raw('SUM(li.taxable_amount) as taxable'),
                DB::raw('SUM(li.cgst_amount) as cgst'),
                DB::raw('SUM(li.sgst_amount) as sgst'),
                DB::raw('SUM(li.igst_amount) as igst'),
                DB::raw('SUM(li.total_amount) as total')
            )
            ->groupBy('li.hsn_sac')->orderByDesc('total')->get();

        $yearly = (clone $base)
            ->selectRaw('YEAR(document_date) as year, type, COUNT(*) as count, SUM(taxable_amount) as taxable, SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total, SUM(cgst_amount) as cgst, SUM(sgst_amount) as sgst, SUM(igst_amount) as igst, SUM(cgst_amount+sgst_amount+igst_amount) as gst')
            ->groupBy('year', 'type')->orderBy('year')->get();

        $typeDistribution = [
            ['type' => 'tax_invoice', 'count' => $sum('tax_invoice')->count()],
            ['type' => 'bill_of_supply', 'count' => $sum('bill_of_supply')->count()],
            ['type' => 'debit_note', 'count' => $sum('debit_note')->count()],
            ['type' => 'credit_note', 'count' => $sum('credit_note')->count()],
        ];

        $documents = (clone $base)
            ->with('customer:id,name')
            ->orderByDesc('document_date')
            ->orderByDesc('id')
            ->get();

        $documentGroups = [
            'tax_invoices' => $documents->where('type', 'tax_invoice')->values(),
            'bill_of_supply' => $documents->where('type', 'bill_of_supply')->values(),
            'debit_notes' => $documents->where('type', 'debit_note')->values(),
            'credit_notes' => $documents->where('type', 'credit_note')->values(),
        ];

        $gstBucket = function (string $type) use ($sum): array {
            $scope = $sum($type);

            return [
                'taxable_value' => (float) (clone $scope)->sum('taxable_amount'),
                'cgst' => (float) (clone $scope)->sum('cgst_amount'),
                'sgst' => (float) (clone $scope)->sum('sgst_amount'),
                'igst' => (float) (clone $scope)->sum('igst_amount'),
                'total_invoice_value' => (float) (clone $scope)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
            ];
        };

        $partyWise = (clone $base)
            ->select(
                'customer_id',
                DB::raw('COUNT(*) as invoices'),
                DB::raw('SUM(taxable_amount) as taxable'),
                DB::raw('SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total')
            )
            ->groupBy('customer_id')
            ->with('customer:id,name')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'client' => $profile->only(['id', 'client_code', 'client_name', 'business_name', 'gstin', 'has_gst', 'dealer_type']),
            'period' => ['from' => $from, 'to' => $to],
            'summary' => [
                'tax_invoices' => $sum('tax_invoice')->count(),
                'bill_of_supply' => $sum('bill_of_supply')->count(),
                'debit_notes' => $sum('debit_note')->count(),
                'credit_notes' => $sum('credit_note')->count(),
                'total_documents' => (clone $base)->count(),
                'total_invoice_value' => (float) (clone $base)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
                'taxable_value' => (float) (clone $base)->sum('taxable_amount'),
                'cgst' => (float) (clone $base)->sum('cgst_amount'),
                'sgst' => (float) (clone $base)->sum('sgst_amount'),
                'igst' => (float) (clone $base)->sum('igst_amount'),
                'total_gst' => (float) (clone $base)->selectRaw('SUM(cgst_amount+sgst_amount+igst_amount) as t')->value('t'),
                'net_invoice_value' => (float) (clone $base)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
            ],
            'monthly' => $monthly,
            'monthly_report' => $monthly,
            'yearly' => $yearly,
            'yearly_report' => $this->yearlyTotals($yearly),
            'type_distribution' => $typeDistribution,
            'hsn_summary' => $hsn,
            'documents' => $documentGroups,
            'gst_matrix' => $this->applyDealerGstMatrix([
                'tax_invoice' => $gstBucket('tax_invoice'),
                'bill_of_supply' => $gstBucket('bill_of_supply'),
                'debit_note' => $gstBucket('debit_note'),
                'credit_note' => $gstBucket('credit_note'),
            ], $profile),
            'party_wise' => $partyWise,
        ]);
    }

    public function exportBilling(Request $request, int $id)
    {
        $profile = ClientProfile::findOrFail($id);
        [$from, $to] = $this->dateRange($request);
        $type = $request->input('type', 'invoice_register');
        $format = $request->input('format', 'xls');

        if ($type === 'gst_summary') {
            $base = CommercialDocument::where('client_profile_id', $profile->id)
                ->whereBetween('document_date', [$from, $to])
                ->where('status', 'issued');
            $bucket = function (string $docType) use ($base): array {
                return [
                    'taxable_value' => (float) (clone $base)->where('type', $docType)->sum('taxable_amount'),
                    'cgst' => (float) (clone $base)->where('type', $docType)->sum('cgst_amount'),
                    'sgst' => (float) (clone $base)->where('type', $docType)->sum('sgst_amount'),
                    'igst' => (float) (clone $base)->where('type', $docType)->sum('igst_amount'),
                    'total_invoice_value' => (float) (clone $base)->where('type', $docType)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
                ];
            };
            $matrix = $this->applyDealerGstMatrix([
                'tax_invoice' => $bucket('tax_invoice'),
                'bill_of_supply' => $bucket('bill_of_supply'),
                'debit_note' => $bucket('debit_note'),
                'credit_note' => $bucket('credit_note'),
            ], $profile);
            $keys = [
                'taxable_value' => 'Total Taxable Value',
                'cgst' => 'CGST Amount',
                'sgst' => 'SGST/UTGST Amount',
                'igst' => 'IGST Amount',
                'total_invoice_value' => 'Total Gross Value',
            ];
            $rows = [];
            foreach ($keys as $column => $label) {
                $rows[] = [
                    'Particulars' => $label,
                    'Tax Invoices' => (float) ($matrix['tax_invoice'][$column] ?? 0),
                    'Bill of Supply' => (float) ($matrix['bill_of_supply'][$column] ?? 0),
                    'Debit Notes' => (float) ($matrix['debit_note'][$column] ?? 0),
                    'Credit Notes' => (float) ($matrix['credit_note'][$column] ?? 0),
                ];
            }

            return $this->respondExport($format, $type, $rows);
        }

        if ($type === 'billing_summary') {
            $rows = CommercialDocument::query()
                ->leftJoin('customers as c', 'c.id', '=', 'commercial_documents.customer_id')
                ->where('commercial_documents.client_profile_id', $profile->id)
                ->whereBetween('commercial_documents.document_date', [$from, $to])
                ->where('commercial_documents.status', 'issued')
                ->select(
                    DB::raw('COALESCE(MAX(c.name), "No Party") as Party'),
                    DB::raw('COUNT(*) as Documents'),
                    DB::raw('SUM(commercial_documents.taxable_amount) as Taxable'),
                    DB::raw('SUM(commercial_documents.cgst_amount) as CGST'),
                    DB::raw('SUM(commercial_documents.sgst_amount) as SGST'),
                    DB::raw('SUM(commercial_documents.igst_amount) as IGST'),
                    DB::raw('SUM(COALESCE(NULLIF(commercial_documents.grand_total,0), commercial_documents.total_amount)) as Total')
                )
                ->groupBy('commercial_documents.customer_id')
                ->orderByDesc('Total')
                ->get()
                ->map(fn ($row) => $row->toArray())
                ->all();

            return $this->respondExport($format, $type, $rows);
        }

        if ($type === 'hsn_summary') {
            $hsn = DB::table('document_line_items as li')
                ->join('commercial_documents as d', 'd.id', '=', 'li.commercial_document_id')
                ->where('d.client_profile_id', $profile->id)
                ->whereBetween('d.document_date', [$from, $to])
                ->where('d.status', 'issued')
                ->select(
                    'li.hsn_sac',
                    DB::raw('MAX(li.description) as description'),
                    DB::raw('MAX(li.unit) as uqc'),
                    DB::raw('SUM(li.qty) as qty'),
                    DB::raw('SUM(li.taxable_amount) as taxable'),
                    DB::raw('SUM(li.cgst_amount) as cgst'),
                    DB::raw('SUM(li.sgst_amount) as sgst'),
                    DB::raw('SUM(li.igst_amount) as igst'),
                    DB::raw('SUM(li.total_amount) as total')
                )
                ->groupBy('li.hsn_sac')->orderByDesc('total')->get()
                ->map(fn ($r) => (array) $r)->all();

            return $this->respondExport($format, $type, $hsn);
        }

        if ($type === 'monthly_report') {
            $rows = CommercialDocument::where('client_profile_id', $profile->id)
                ->whereBetween('document_date', [$from, $to])->where('status', 'issued')
                ->selectRaw('DATE_FORMAT(document_date, "%Y-%m") as month,
                    SUM(CASE WHEN type = "tax_invoice" THEN 1 ELSE 0 END) as tax_invoices,
                    SUM(CASE WHEN type = "bill_of_supply" THEN 1 ELSE 0 END) as bill_of_supply,
                    SUM(CASE WHEN type = "debit_note" THEN 1 ELSE 0 END) as debit_notes,
                    SUM(CASE WHEN type = "credit_note" THEN 1 ELSE 0 END) as credit_notes,
                    SUM(taxable_amount) as taxable_turnover,
                    SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as invoice_value,
                    SUM(cgst_amount) as cgst, SUM(sgst_amount) as sgst, SUM(igst_amount) as igst,
                    SUM(cgst_amount+sgst_amount+igst_amount) as gst_liability')
                ->groupBy('month')->orderBy('month')->get()->map(fn ($r) => (array) $r->toArray())->all();

            return $this->respondExport($format, $type, $rows);
        }

        if ($type === 'yearly_report') {
            $yearly = CommercialDocument::where('client_profile_id', $profile->id)
                ->whereBetween('document_date', [$from, $to])->where('status', 'issued')
                ->selectRaw('YEAR(document_date) as year, type, COUNT(*) as count, SUM(taxable_amount) as taxable, SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total, SUM(cgst_amount+sgst_amount+igst_amount) as gst')
                ->groupBy('year', 'type')->orderBy('year')->get();
            $rows = $this->yearlyTotals($yearly);

            return $this->respondExport($format, $type, $rows);
        }

        $registerMap = [
            'invoice_register' => null,
            'tax_invoice_register' => 'tax_invoice',
            'bill_of_supply_register' => 'bill_of_supply',
            'debit_note_register' => 'debit_note',
            'credit_note_register' => 'credit_note',
        ];
        $docType = $registerMap[$type] ?? null;

        $docs = CommercialDocument::with('customer:id,name')
            ->where('client_profile_id', $profile->id)
            ->whereBetween('document_date', [$from, $to])
            ->where('status', 'issued')
            ->when($docType, fn ($q) => $q->where('type', $docType))
            ->orderBy('document_date')
            ->get()
            ->map(fn ($d) => [
                'Number' => $d->number,
                'Date' => $d->document_date?->format('Y-m-d'),
                'Type' => $d->type,
                'Party' => $d->customer?->name,
                'Taxable' => $d->taxable_amount,
                'CGST' => $d->cgst_amount,
                'SGST' => $d->sgst_amount,
                'IGST' => $d->igst_amount,
                'Total' => $d->grand_total ?: $d->total_amount,
                'Status' => $d->status,
            ])->all();

        return $this->respondExport($format, $type, $docs);
    }

    public function downloadZip(Request $request, int $id)
    {
        $profile = ClientProfile::findOrFail($id);
        [$from, $to] = $this->dateRange($request);
        $docType = $request->input('document_type');

        $docs = CommercialDocument::where('client_profile_id', $profile->id)
            ->whereBetween('document_date', [$from, $to])
            ->where('status', 'issued')
            ->when($docType && $docType !== 'all', fn ($q) => $q->where('type', $docType))
            ->get();

        $zipPath = storage_path('app/temp/client-'.$profile->id.'-'.time().'.zip');
        @mkdir(dirname($zipPath), 0755, true);
        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($docs as $doc) {
            if ($doc->pdf_path && Storage::disk('public')->exists($doc->pdf_path)) {
                $name = ($doc->number ?: 'doc-'.$doc->id).'.pdf';
                $zip->addFile(Storage::disk('public')->path($doc->pdf_path), $name);
            }
        }
        $zip->close();

        return response()->download($zipPath, "invoices-{$profile->client_code}.zip")->deleteFileAfterSend(true);
    }

    private function validatePayload(Request $request, bool $creating, ?ClientProfile $profile = null): array
    {
        $rules = [
            'client_name' => ($creating ? 'required' : 'sometimes').'|string',
            'business_name' => 'nullable|string',
            'email' => ($creating ? 'required' : 'sometimes').'|email|unique:users,email'.($profile ? ','.$profile->user_id : ''),
            'password' => ($creating ? 'required' : 'nullable').'|string|min:8',
            'mobile' => 'nullable|string',
            'phone' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'client_code' => 'nullable|string|unique:client_profiles,client_code'.($profile ? ','.$profile->id : ''),
            'constitution_type' => 'nullable|string',
            'business_type' => 'nullable|string',
            'date_of_incorporation' => 'nullable|date',
            'date_of_birth' => 'nullable|date',
            'alt_mobile' => 'nullable|string',
            'alt_email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'state_code' => 'nullable|string|max:2',
            'pincode' => 'nullable|string',
            'country' => 'nullable|string',
            'website' => 'nullable|string',
            'gstin' => 'nullable|string',
            'has_gst' => 'nullable|boolean',
            'dealer_type' => 'nullable|in:regular,composition',
            'gst_filing_frequency' => 'nullable|in:monthly,quarterly',
            'pan' => 'nullable|string',
            'aadhaar' => 'nullable|string',
            'gst_portal_username' => 'nullable|string',
            'gst_portal_password' => 'nullable|string',
            'tan' => 'nullable|string',
            'tan_portal_password' => 'nullable|string',
            'it_portal_password' => 'nullable|string',
            'udyam' => 'nullable|string',
            'shop_establishment' => 'nullable|string',
            'iec' => 'nullable|string',
            'cin' => 'nullable|string',
            'llpin' => 'nullable|string',
            'pt_reg' => 'nullable|string',
            'esic' => 'nullable|string',
            'pf' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'bank_branch' => 'nullable|string',
            'bank_account' => 'nullable|string',
            'account_holder_name' => 'nullable|string',
            'bank_ifsc' => 'nullable|string',
            'swift_code' => 'nullable|string',
            'account_type' => 'nullable|string',
            'upi_id' => 'nullable|string',
            'signatory_name' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'invoice_prefix' => 'nullable|string|max:40',
            'bill_of_supply_prefix' => 'nullable|string|max:40',
            'credit_note_prefix' => 'nullable|string|max:40',
            'debit_note_prefix' => 'nullable|string|max:40',
            'quotation_prefix' => 'nullable|string|max:40',
            'amendment_prefix' => 'nullable|string|max:40',
            'invoice_next_number' => 'nullable|integer|min:1',
            'bill_of_supply_next_number' => 'nullable|integer|min:1',
            'credit_note_next_number' => 'nullable|integer|min:1',
            'debit_note_next_number' => 'nullable|integer|min:1',
            'quotation_next_number' => 'nullable|integer|min:1',
            'amendment_next_number' => 'nullable|integer|min:1',
        ];

        return $request->validate($rules);
    }

    private function normalizeGstFields(array $data): array
    {
        $hasGst = filter_var($data['has_gst'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $data['has_gst'] = $hasGst;
        if (! $hasGst) {
            $data['dealer_type'] = null;
            $data['gst_filing_frequency'] = null;
        } else {
            if (empty($data['dealer_type'])) {
                $data['dealer_type'] = 'regular';
            }
            if ($data['dealer_type'] === 'composition') {
                $data['gst_filing_frequency'] = 'quarterly';
            } elseif (empty($data['gst_filing_frequency'])) {
                $data['gst_filing_frequency'] = 'monthly'; // default for regular if omitted
            }
        }

        return $data;
    }

    private function profileFields(array $data, ?ClientProfile $existing = null): array
    {
        $data = $this->normalizeGstFields($data);
        $fields = [
            'client_name', 'business_name', 'constitution_type', 'business_type',
            'date_of_incorporation', 'date_of_birth', 'mobile', 'alt_mobile', 'alt_email',
            'email', 'address', 'city', 'state', 'state_code', 'pincode', 'country', 'website',
            'gstin', 'has_gst', 'dealer_type', 'gst_filing_frequency', 'pan', 'aadhaar', 'gst_portal_username', 'tan', 'udyam', 'shop_establishment',
            'iec', 'cin', 'llpin', 'pt_reg', 'esic', 'pf',
            'bank_name', 'bank_branch', 'bank_account', 'account_holder_name', 'bank_ifsc',
            'swift_code', 'account_type', 'upi_id', 'signatory_name', 'terms_conditions', 'client_code',
            'invoice_prefix', 'bill_of_supply_prefix', 'credit_note_prefix', 'debit_note_prefix',
            'quotation_prefix', 'amendment_prefix',
            'invoice_next_number', 'bill_of_supply_next_number', 'credit_note_next_number',
            'debit_note_next_number', 'quotation_next_number', 'amendment_next_number',
        ];

        $out = [];
        foreach ($fields as $f) {
            if (array_key_exists($f, $data)) {
                $out[$f] = $data[$f];
            }
        }

        foreach (self::ENCRYPTED as $f) {
            if (! empty($data[$f])) {
                $out[$f] = Crypt::encryptString($data[$f]);
            } elseif ($existing && array_key_exists($f, $data) && $data[$f] === '') {
                $out[$f] = null;
            }
        }

        return $out;
    }

    private function handleUploads(Request $request, ClientProfile $profile): void
    {
        // Logo, signature, seal, and QR are managed via client change-request approval only.
    }

    private function nextClientCode(): string
    {
        $n = ClientProfile::count() + 1;

        return 'CL-'.str_pad((string) $n, 4, '0', STR_PAD_LEFT);
    }

    private function applyDealerGstMatrix(array $matrix, ClientProfile $profile): array
    {
        $zero = [
            'taxable_value' => 0.0,
            'cgst' => 0.0,
            'sgst' => 0.0,
            'igst' => 0.0,
            'total_invoice_value' => 0.0,
        ];
        $out = [
            'tax_invoice' => $matrix['tax_invoice'] ?? $zero,
            'bill_of_supply' => $matrix['bill_of_supply'] ?? $zero,
            'debit_note' => $matrix['debit_note'] ?? $zero,
            'credit_note' => $matrix['credit_note'] ?? $zero,
        ];
        $mode = BillingPolicy::mode($profile);
        if ($mode === 'regular') {
            $out['bill_of_supply'] = $zero;
        } elseif ($mode === 'composition') {
            $out['tax_invoice'] = $zero;
            $out['debit_note'] = $zero;
        }

        return $out;
    }

    private function dateRange(Request $request): array
    {
        $preset = $request->input('preset', 'this_month');
        $now = now();

        return match ($preset) {
            'today' => [$now->toDateString(), $now->toDateString()],
            'yesterday' => [$now->copy()->subDay()->toDateString(), $now->copy()->subDay()->toDateString()],
            'this_week' => [$now->copy()->startOfWeek()->toDateString(), $now->toDateString()],
            'last_month' => [$now->copy()->subMonth()->startOfMonth()->toDateString(), $now->copy()->subMonth()->endOfMonth()->toDateString()],
            'quarterly' => [$now->copy()->firstOfQuarter()->toDateString(), $now->toDateString()],
            'financial_year' => $now->month >= 4
                ? [$now->year.'-04-01', ($now->year + 1).'-03-31']
                : [($now->year - 1).'-04-01', $now->year.'-03-31'],
            'this_month' => [$now->copy()->startOfMonth()->toDateString(), $now->toDateString()],
            'custom' => [
                $request->input('from', $now->copy()->startOfMonth()->toDateString()),
                $request->input('to', $now->toDateString()),
            ],
            default => [$now->copy()->startOfMonth()->toDateString(), $now->toDateString()],
        };
    }

    private function yearlyTotals($yearly): array
    {
        $byYear = [];
        foreach ($yearly as $row) {
            $y = $row->year;
            if (! isset($byYear[$y])) {
                $byYear[$y] = [
                    'year' => $y,
                    'total_documents' => 0,
                    'tax_invoices' => 0,
                    'bill_of_supply' => 0,
                    'debit_notes' => 0,
                    'credit_notes' => 0,
                    'taxable_turnover' => 0,
                    'invoice_value' => 0,
                    'cgst' => 0,
                    'sgst' => 0,
                    'igst' => 0,
                    'gst_liability' => 0,
                ];
            }
            $byYear[$y]['total_documents'] += (int) $row->count;
            $byYear[$y][$row->type === 'tax_invoice' ? 'tax_invoices' : ($row->type === 'bill_of_supply' ? 'bill_of_supply' : ($row->type === 'debit_note' ? 'debit_notes' : 'credit_notes'))] += (int) $row->count;
            $byYear[$y]['taxable_turnover'] += (float) $row->taxable;
            $byYear[$y]['invoice_value'] += (float) $row->total;
            $byYear[$y]['cgst'] += (float) ($row->cgst ?? 0);
            $byYear[$y]['sgst'] += (float) ($row->sgst ?? 0);
            $byYear[$y]['igst'] += (float) ($row->igst ?? 0);
            $byYear[$y]['gst_liability'] += (float) ($row->gst ?? 0);
        }

        return array_values($byYear);
    }

    private function respondExport(string $format, string $type, array $rows)
    {
        if ($format === 'csv') {
            return $this->csvDownload($type, $rows);
        }
        if ($format === 'pdf') {
            return $this->pdfDownload($type, $rows);
        }

        return $this->xlsxDownload($type, $rows);
    }

    private function pdfDownload(string $type, array $rows)
    {
        $headers = array_keys($rows[0] ?? ['Message' => 'No data']);
        $html = '<html><head><style>body{font-family:DejaVu Sans,sans-serif;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px;text-align:left}th{background:#eee}</style></head><body>';
        $html .= '<h2>'.htmlspecialchars(strtoupper(str_replace('_', ' ', $type))).'</h2>';
        $html .= '<table><thead><tr>';
        foreach ($headers as $h) {
            $html .= '<th>'.htmlspecialchars((string) $h).'</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach ($rows as $row) {
            $html .= '<tr>';
            foreach ($headers as $h) {
                $v = $row[$h] ?? '';
                $html .= '<td>'.htmlspecialchars(is_scalar($v) || $v === null ? (string) $v : json_encode($v)).'</td>';
            }
            $html .= '</tr>';
        }
        if (! $rows) {
            $html .= '<tr><td colspan="'.max(1, count($headers)).'">No data</td></tr>';
        }
        $html .= '</tbody></table></body></html>';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->setPaper('a4', 'landscape');

        return $pdf->download("{$type}.pdf");
    }

    private function csvDownload(string $type, array $rows)
    {
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            $first = $rows[0] ?? [];
            if ($first) {
                fputcsv($out, array_keys($first));
            }
            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($v) => is_scalar($v) || $v === null ? $v : json_encode($v), $row));
            }
            fclose($out);
        }, "{$type}.csv", ['Content-Type' => 'text/csv']);
    }

    private function xlsxDownload(string $type, array $rows)
    {
        $headers = array_keys($rows[0] ?? ['value' => '']);
        $xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
        $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>';
        $xml .= '<Row>';
        foreach ($headers as $h) {
            $xml .= '<Cell><Data ss:Type="String">'.htmlspecialchars((string) $h).'</Data></Cell>';
        }
        $xml .= '</Row>';
        foreach ($rows as $row) {
            $xml .= '<Row>';
            foreach ($headers as $h) {
                $v = $row[$h] ?? '';
                $typeAttr = is_numeric($v) ? 'Number' : 'String';
                $xml .= '<Cell><Data ss:Type="'.$typeAttr.'">'.htmlspecialchars((string) $v).'</Data></Cell>';
            }
            $xml .= '</Row>';
        }
        $xml .= '</Table></Worksheet></Workbook>';

        return response($xml, 200, [
            'Content-Type' => 'application/vnd.ms-excel',
            'Content-Disposition' => "attachment; filename=\"{$type}.xls\"",
        ]);
    }
}
