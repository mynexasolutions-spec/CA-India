<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientGstReturn;
use App\Models\ClientProfile;
use Illuminate\Http\Request;

class GstReturnController extends Controller
{
    /**
     * Dashboard Overview (Cards)
     */
    public function dashboard(Request $request)
    {
        $month = $request->input('month', now()->format('Y-m')); // e.g. "2026-04"
        $quarter = $request->input('quarter', now()->year . '-Q' . ceil(now()->month / 3)); // e.g. "2026-Q1"

        // Overall summary
        $totalGstClients = ClientProfile::where('has_gst', true)->count();
        $regularClients = ClientProfile::where('dealer_type', 'regular')->where('has_gst', true)->count();
        $compositionClients = ClientProfile::where('dealer_type', 'composition')->where('has_gst', true)->count();

        // Monthly Stats
        $monthlyClientsCount = ClientProfile::where('has_gst', true)->where('gst_filing_frequency', 'monthly')->count();
        $monthlyFiledCount = ClientGstReturn::where('tax_period', $month)
            ->whereHas('clientProfile', fn($q) => $q->where('gst_filing_frequency', 'monthly'))
            ->count();
        $monthlyPendingCount = max(0, $monthlyClientsCount - $monthlyFiledCount);

        // Quarterly Stats
        $quarterlyClientsCount = ClientProfile::where('has_gst', true)->where('gst_filing_frequency', 'quarterly')->count();
        $quarterlyFiledCount = ClientGstReturn::where('tax_period', $quarter)
            ->whereHas('clientProfile', fn($q) => $q->where('gst_filing_frequency', 'quarterly'))
            ->count();
        $quarterlyPendingCount = max(0, $quarterlyClientsCount - $quarterlyFiledCount);

        return response()->json([
            'overall' => [
                'total' => $totalGstClients,
                'regular' => $regularClients,
                'composition' => $compositionClients,
                'total_filed' => $monthlyFiledCount + $quarterlyFiledCount,
                'total_pending' => $monthlyPendingCount + $quarterlyPendingCount,
            ],
            'monthly' => [
                'period' => $month,
                'total' => $monthlyClientsCount,
                'filed' => $monthlyFiledCount,
                'pending' => $monthlyPendingCount,
            ],
            'quarterly' => [
                'period' => $quarter,
                'total' => $quarterlyClientsCount,
                'filed' => $quarterlyFiledCount,
                'pending' => $quarterlyPendingCount,
            ]
        ]);
    }

    /**
     * Client List for a specific period
     */
    public function index(Request $request)
    {
        $period = $request->input('period'); // "2026-04"
        
        $q = ClientProfile::query()
            ->where('has_gst', true)
            ->with(['gstReturns' => function($q) use ($period) {
                if ($period) {
                    $q->where('tax_period', $period);
                } else {
                    $q->latest('tax_period')->limit(1); // just get the most recent
                }
            }]);

        if ($request->filled('registration_type')) {
            $q->where('dealer_type', $request->registration_type);
        }

        if ($request->filled('frequency')) {
            $q->where('gst_filing_frequency', $request->frequency);
        }

        if ($request->filled('q')) {
            $search = $request->q;
            $q->where(fn($w) => $w->where('client_name', 'like', "%{$search}%")
                                  ->orWhere('business_name', 'like', "%{$search}%")
                                  ->orWhere('gstin', 'like', "%{$search}%"));
        }

        $clients = $q->orderBy('business_name')->paginate(25);

        // Transform results to add status
        $clients->getCollection()->transform(function ($client) use ($period) {
            $filed = $client->gstReturns->firstWhere('tax_period', $period);
            $lastFiled = $client->gstReturns->sortByDesc('tax_period')->first();

            return [
                'id' => $client->id,
                'business_name' => $client->business_name,
                'client_name' => $client->client_name,
                'gstin' => $client->gstin,
                'registration_type' => $client->dealer_type,
                'frequency' => $client->gst_filing_frequency,
                'status' => $filed ? 'filed' : 'pending',
                'last_filed' => $lastFiled ? $lastFiled->tax_period : null,
            ];
        });

        return response()->json($clients);
    }

    /**
     * Mark a return as filed (or un-filed)
     */
    public function store(Request $request, int $clientId)
    {
        $data = $request->validate([
            'tax_period' => 'required|string|max:10', // e.g. 2026-04 or 2026-Q1
            'status' => 'required|in:filed,pending',
        ]);

        $client = ClientProfile::findOrFail($clientId);

        if ($data['status'] === 'filed') {
            $return = ClientGstReturn::updateOrCreate(
                [
                    'client_profile_id' => $client->id,
                    'tax_period' => $data['tax_period'],
                ],
                [
                    'status' => 'filed',
                    'filed_on' => now(),
                    'filed_by' => $request->user()->id,
                ]
            );
            return response()->json(['message' => 'Marked as filed', 'return' => $return]);
        } else {
            ClientGstReturn::where('client_profile_id', $client->id)
                ->where('tax_period', $data['tax_period'])
                ->delete();
            return response()->json(['message' => 'Marked as pending']);
        }
    }
}
