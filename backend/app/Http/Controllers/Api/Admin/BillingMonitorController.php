<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ClientProfile;
use App\Models\CommercialDocument;
use App\Models\User;
use App\Services\Billing\BillingPolicy;
use App\Services\Billing\InvoiceService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class BillingMonitorController extends Controller
{
    public function __construct(private InvoiceService $invoices)
    {
    }

    public function dashboard(Request $request)
    {
        $yearStart = now()->month >= 4
            ? now()->year.'-04-01'
            : (now()->year - 1).'-04-01';

        $issued = CommercialDocument::where('type', 'tax_invoice')->where('status', 'issued');
        $fy = (clone $issued)->where('document_date', '>=', $yearStart);

        $monthly = CommercialDocument::where('type', 'tax_invoice')->where('status', 'issued')
            ->where('document_date', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw(BillingPolicy::monthGroupExpr('document_date').' as month, COUNT(*) as count, SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total, SUM(taxable_amount) as taxable, SUM(cgst_amount+sgst_amount+igst_amount) as gst')
            ->groupBy('month')->orderBy('month')->get();

        $topClients = CommercialDocument::where('type', 'tax_invoice')->where('status', 'issued')
            ->select('client_profile_id', DB::raw('COUNT(*) as invoices'), DB::raw('SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total'))
            ->groupBy('client_profile_id')
            ->with('clientProfile:id,business_name,gstin')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $clientWise = ClientProfile::query()
            ->orderBy('business_name')
            ->limit(50)
            ->get(['id', 'business_name', 'gstin', 'user_id'])
            ->map(function ($p) {
                $p->tax_invoices_count = CommercialDocument::where('client_profile_id', $p->id)->where('type', 'tax_invoice')->count();
                $p->debit_notes_count = CommercialDocument::where('client_profile_id', $p->id)->where('type', 'debit_note')->count();
                $p->credit_notes_count = CommercialDocument::where('client_profile_id', $p->id)->where('type', 'credit_note')->count();
                $p->total_amount = (float) CommercialDocument::where('client_profile_id', $p->id)
                    ->where('type', 'tax_invoice')->where('status', 'issued')
                    ->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)'));

                return $p;
            });

        $hsn = DB::table('document_line_items as li')
            ->join('commercial_documents as d', 'd.id', '=', 'li.commercial_document_id')
            ->where('d.type', 'tax_invoice')->where('d.status', 'issued')
            ->where('d.document_date', '>=', $yearStart)
            ->select('li.hsn_sac', DB::raw('MAX(li.description) as description'), DB::raw('SUM(li.qty) as qty'), DB::raw('SUM(li.taxable_amount) as taxable'), DB::raw('SUM(li.cgst_amount+li.sgst_amount+li.igst_amount) as gst'), DB::raw('SUM(li.total_amount) as total'))
            ->groupBy('li.hsn_sac')->orderByDesc('total')->limit(20)->get();

        $recent = CommercialDocument::with(['customer:id,name', 'clientProfile:id,business_name'])
            ->latest('document_date')->latest('id')->limit(12)->get();

        return response()->json([
            'kpis' => [
                'total_clients' => ClientProfile::count(),
                'total_invoices' => CommercialDocument::count(),
                'tax_invoices' => CommercialDocument::where('type', 'tax_invoice')->count(),
                'debit_notes' => CommercialDocument::where('type', 'debit_note')->count(),
                'credit_notes' => CommercialDocument::where('type', 'credit_note')->count(),
            ],
            'gst_fy' => [
                'taxable_value' => (float) (clone $fy)->sum('taxable_amount'),
                'cgst' => (float) (clone $fy)->sum('cgst_amount'),
                'sgst' => (float) (clone $fy)->sum('sgst_amount'),
                'igst' => (float) (clone $fy)->sum('igst_amount'),
                'total_gst' => (float) (clone $fy)->selectRaw('SUM(cgst_amount+sgst_amount+igst_amount) as t')->value('t'),
                'total_invoice_value' => (float) (clone $fy)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
            ],
            'monthly_trend' => $monthly,
            'top_clients' => $topClients,
            'client_wise' => $clientWise,
            'hsn_summary' => $hsn,
            'recent_invoices' => $recent,
        ]);
    }

    public function invoices(Request $request)
    {
        $q = CommercialDocument::with(['customer:id,name', 'clientProfile:id,business_name,gstin'])
            ->latest('document_date')->latest('id');

        if ($request->filled('client_profile_id')) {
            $q->where('client_profile_id', $request->client_profile_id);
        }
        if ($request->filled('type')) {
            $q->where('type', $request->type);
        }
        if ($request->filled('from')) {
            $q->whereDate('document_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $q->whereDate('document_date', '<=', $request->to);
        }
        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('number', 'like', "%{$s}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$s}%"))
                    ->orWhereHas('clientProfile', fn ($c) => $c->where('business_name', 'like', "%{$s}%")->orWhere('gstin', 'like', "%{$s}%"));
            });
        }

        return response()->json($q->paginate(30));
    }

    public function showInvoice(int $id)
    {
        $doc = CommercialDocument::with([
            'lineItems',
            'customer',
            'clientProfile',
            'referenceDocument:id,number,type,document_date,grand_total,total_amount,status',
            'tdsTcsSection',
        ])->findOrFail($id);

        return response()->json($doc);
    }

    public function pdfInvoice(int $id)
    {
        $doc = CommercialDocument::findOrFail($id);
        $this->invoices->generatePdf($doc);
        $doc->refresh();

        return response()->json(['url' => '/storage/'.$doc->pdf_path, 'path' => $doc->pdf_path]);
    }

    public function report(Request $request)
    {
        $type = $request->input('type', 'gst_summary');
        $from = $request->input('from', now()->startOfMonth()->toDateString());
        $to = $request->input('to', now()->toDateString());

        $base = CommercialDocument::whereBetween('document_date', [$from, $to]);
        $data = match ($type) {
            'client_wise_register' => (clone $base)->with(['customer:id,name', 'clientProfile:id,business_name'])->orderBy('document_date')->get(),
            'monthly_sales' => (clone $base)->where('type', 'tax_invoice')->where('status', 'issued')
                ->selectRaw(BillingPolicy::monthGroupExpr('document_date').' as month, COUNT(*) as count, SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total')
                ->groupBy('month')->orderBy('month')->get(),
            'gst_summary' => $this->gstSummaryMatrixFirm($base),
            'hsn_summary' => DB::table('document_line_items as li')
                ->join('commercial_documents as d', 'd.id', '=', 'li.commercial_document_id')
                ->whereBetween('d.document_date', [$from, $to])
                ->where('d.type', 'tax_invoice')->where('d.status', 'issued')
                ->select(
                    'li.hsn_sac',
                    DB::raw('MAX(li.description) as description'),
                    DB::raw('MAX(li.gst_rate) as gst_rate'),
                    DB::raw('SUM(li.qty) as qty'),
                    DB::raw('SUM(li.taxable_amount) as taxable'),
                    DB::raw('SUM(li.cgst_amount) as cgst'),
                    DB::raw('SUM(li.sgst_amount) as sgst'),
                    DB::raw('SUM(li.igst_amount) as igst'),
                    DB::raw('SUM(li.total_amount) as total')
                )
                ->groupBy('li.hsn_sac')->get(),
            'party_wise' => (clone $base)->where('type', 'tax_invoice')->where('status', 'issued')
                ->select('customer_id', DB::raw('COUNT(*) as invoices'), DB::raw('SUM(COALESCE(NULLIF(grand_total,0), total_amount)) as total'))
                ->groupBy('customer_id')->with('customer:id,name')->get(),
            default => ['error' => 'Unknown type'],
        };

        $format = $request->input('format', 'json');
        if ($format === 'json') {
            return response()->json(['type' => $type, 'from' => $from, 'to' => $to, 'data' => $data]);
        }

        $rows = is_array($data) && isset($data['taxable']) ? [$data] : (method_exists($data, 'toArray') ? $data->toArray() : (array) $data);
        if ($format === 'pdf') {
            return Pdf::loadView('pdf.report', ['title' => $type, 'from' => $from, 'to' => $to, 'rows' => $rows])->download("{$type}.pdf");
        }

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            if ($rows) {
                fputcsv($out, array_keys((array) $rows[0]));
            }
            foreach ($rows as $row) {
                $arr = (array) $row;
                fputcsv($out, array_map(fn ($v) => is_scalar($v) || $v === null ? $v : json_encode($v), $arr));
            }
            fclose($out);
        }, "{$type}.csv", ['Content-Type' => 'text/csv']);
    }

    public function setClientActive(Request $request, int $id)
    {
        $data = $request->validate(['is_active' => 'required|boolean']);
        $profile = ClientProfile::with('user')->findOrFail($id);
        $profile->user->update(['is_active' => $data['is_active']]);

        return response()->json(['user' => $profile->user->fresh(), 'profile' => $profile]);
    }

    public function resetClientPassword(Request $request, int $id)
    {
        $data = $request->validate(['password' => 'required|string|min:8']);
        $profile = ClientProfile::with('user')->findOrFail($id);
        $profile->user->update(['password' => Hash::make($data['password'])]);
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'reset_client_password',
            'subject_type' => User::class,
            'subject_id' => $profile->user_id,
            'ip_address' => $request->ip(),
        ]);

        return response()->json(['message' => 'Password updated']);
    }

    /** Firm-wide GST matrix — always 4 columns with actual aggregates. */
    private function gstSummaryMatrixFirm($base): array
    {
        $bucket = function (string $type) use ($base): array {
            $scope = (clone $base)->where('type', $type)->where('status', 'issued');

            return [
                'taxable_value' => (float) (clone $scope)->sum('taxable_amount'),
                'cgst' => (float) (clone $scope)->sum('cgst_amount'),
                'sgst' => (float) (clone $scope)->sum('sgst_amount'),
                'igst' => (float) (clone $scope)->sum('igst_amount'),
                'total_invoice_value' => (float) (clone $scope)->sum(DB::raw('COALESCE(NULLIF(grand_total,0), total_amount)')),
            ];
        };

        $tax = $bucket('tax_invoice');
        $bos = $bucket('bill_of_supply');
        $dn = $bucket('debit_note');
        $cn = $bucket('credit_note');

        return [
            'matrix' => [
                'tax_invoice' => $tax,
                'bill_of_supply' => $bos,
                'debit_note' => $dn,
                'credit_note' => $cn,
            ],
            'taxable' => $tax['taxable_value'],
            'cgst' => $tax['cgst'],
            'sgst' => $tax['sgst'],
            'igst' => $tax['igst'],
            'total' => $tax['total_invoice_value'],
        ];
    }

    public function loginHistory(Request $request, int $id)
    {
        $profile = ClientProfile::findOrFail($id);
        $logs = ActivityLog::where('user_id', $profile->user_id)
            ->where('action', 'login')
            ->latest()
            ->paginate(50);

        return response()->json($logs);
    }

    public function updateClient(Request $request, int $id)
    {
        $profile = ClientProfile::with('user')->findOrFail($id);
        $data = $request->validate([
            'business_name' => 'sometimes|string',
            'gstin' => 'nullable|string',
            'pan' => 'nullable|string',
            'email' => 'nullable|email',
            'name' => 'sometimes|string',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
        ]);
        if (isset($data['name']) || array_key_exists('phone', $data)) {
            $profile->user->update(array_filter([
                'name' => $data['name'] ?? null,
                'phone' => $data['phone'] ?? null,
            ], fn ($v) => $v !== null));
        }
        $profile->update(collect($data)->only(['business_name', 'gstin', 'pan', 'email', 'address', 'city'])->toArray());

        return response()->json($profile->fresh()->load('user'));
    }
}
