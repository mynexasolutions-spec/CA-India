<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\CommercialDocument;
use App\Models\GstFilingRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class GstFilingController extends Controller
{
    public function preview(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'filing_period' => 'required|string', // Format: YYYY-MM
            'return_type' => 'required|string|in:GSTR-1,GSTR-3B,Both',
        ]);

        $clientProfileId = $request->user()->clientProfile->id;
        $period = $request->filing_period;
        
        // Allowed types for GST calculation
        $types = ['tax_invoice', 'credit_note', 'debit_note'];

        $bills = CommercialDocument::where('client_profile_id', $clientProfileId)
            ->whereIn('type', $types)
            ->whereIn('status', ['issued', 'paid'])
            ->whereRaw("DATE_FORMAT(document_date, '%Y-%m') = ?", [$period])
            ->get();

        $taxableValue = 0;
        $cgst = 0;
        $sgst = 0;
        $igst = 0;

        foreach ($bills as $bill) {
            $taxableValue += $bill->taxable_amount;
            $cgst += $bill->cgst_amount;
            $sgst += $bill->sgst_amount;
            $igst += $bill->igst_amount;
        }

        $totalGst = $cgst + $sgst + $igst;

        return response()->json([
            'bills' => $bills,
            'summary' => [
                'total_bills' => $bills->count(),
                'taxable_value' => $taxableValue,
                'total_cgst' => $cgst,
                'total_sgst' => $sgst,
                'total_igst' => $igst,
                'total_gst' => $totalGst,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'financial_year' => 'required|string',
            'filing_period' => 'required|string',
            'return_type' => 'required|string',
            'client_declaration' => 'required|accepted',
        ]);

        $clientProfileId = $request->user()->clientProfile->id;

        // Check if there's already an active request for this period
        $existing = GstFilingRequest::where('client_profile_id', $clientProfileId)
            ->where('filing_period', $request->filing_period)
            ->whereNotIn('status', ['Correction Required']) // Allow new one if old was correction required? Or just block if Pending/Approved
            ->first();
            
        if ($existing && in_array($existing->status, ['Pending CA Review', 'Approved for Filing', 'GST Filed'])) {
            return response()->json(['message' => 'A GST Filing request for this period is already in progress or completed.'], 400);
        }

        // Fetch bills again
        $period = $request->filing_period;
        $types = ['tax_invoice', 'credit_note', 'debit_note'];
        
        $bills = CommercialDocument::where('client_profile_id', $clientProfileId)
            ->whereIn('type', $types)
            ->whereIn('status', ['issued', 'paid'])
            ->whereRaw("DATE_FORMAT(document_date, '%Y-%m') = ?", [$period])
            ->get();


        $taxableValue = $bills->sum('taxable_amount');
        $cgst = $bills->sum('cgst_amount');
        $sgst = $bills->sum('sgst_amount');
        $igst = $bills->sum('igst_amount');
        $totalGst = $cgst + $sgst + $igst;

        $filingRequest = GstFilingRequest::create([
            'client_profile_id' => $clientProfileId,
            'financial_year' => $request->financial_year,
            'filing_period' => $request->filing_period,
            'return_type' => $request->return_type,
            'status' => 'Pending CA Review',
            'total_bills' => $bills->count(),
            'taxable_value' => $taxableValue,
            'total_cgst' => $cgst,
            'total_sgst' => $sgst,
            'total_igst' => $igst,
            'total_gst' => $totalGst,
            'client_declaration' => $request->client_declaration,
        ]);

        // Attach documents to pivot table
        $filingRequest->documents()->attach($bills->pluck('id'));

        return response()->json([
            'message' => 'GST filing confirmation has been sent to CA for review and filing process.',
            'request' => $filingRequest
        ]);
    }

    public function index(Request $request)
    {
        $requests = GstFilingRequest::where('client_profile_id', $request->user()->clientProfile->id)
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($requests);
    }

    public function show(Request $request, $id)
    {
        $filingRequest = GstFilingRequest::with('documents')->where('client_profile_id', $request->user()->clientProfile->id)->findOrFail($id);
        
        return response()->json($filingRequest);
    }
}
