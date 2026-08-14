<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientGstr2bInvoice;
use App\Models\ClientGstr2bRecord;
use App\Models\ClientProfile;
use App\Services\Gstr2b\Gstr2bJsonParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Throwable;

class Gstr2bController extends Controller
{
    public function index(int $clientId)
    {
        ClientProfile::findOrFail($clientId);

        $records = ClientGstr2bRecord::where('client_profile_id', $clientId)
            ->withCount('invoices')
            ->with('uploader:id,name')
            ->orderByDesc('tax_period')
            ->get();

        return response()->json($records);
    }

    public function upload(Request $request, int $clientId)
    {
        ClientProfile::findOrFail($clientId);

        $data = $request->validate([
            'tax_period' => 'required|regex:/^\d{4}-\d{2}$/',
            'file' => 'required|file|mimes:pdf,xls,xlsx,json,csv|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->store('gstr2b/'.$clientId, 'public');

        $existing = ClientGstr2bRecord::where('client_profile_id', $clientId)
            ->where('tax_period', $data['tax_period'])
            ->first();

        $attrs = [
            'financial_year' => $this->deriveFinancialYear($data['tax_period']),
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ];

        if ($existing) {
            Storage::disk('public')->delete($existing->file_path);
            $existing->update($attrs);
            $record = $existing;
        } else {
            $record = ClientGstr2bRecord::create([
                'client_profile_id' => $clientId,
                'tax_period' => $data['tax_period'],
                ...$attrs,
            ]);
        }

        $parseWarning = null;

        if (strtolower($file->getClientOriginalExtension()) === 'json') {
            ClientGstr2bInvoice::where('gstr2b_record_id', $record->id)->delete();

            try {
                $rows = app(Gstr2bJsonParser::class)->parse(Storage::disk('public')->get($path));

                foreach ($rows as $row) {
                    ClientGstr2bInvoice::create([
                        ...$row,
                        'client_profile_id' => $clientId,
                        'gstr2b_record_id' => $record->id,
                        'financial_year' => $record->financial_year,
                        'tax_period' => $record->tax_period,
                    ]);
                }
            } catch (Throwable $e) {
                $parseWarning = $e->getMessage();
            }
        }

        $response = $record->fresh(['uploader:id,name'])->toArray();
        $response['parse_warning'] = $parseWarning;

        return response()->json($response, $existing ? 200 : 201);
    }

    public function destroy(int $clientId, int $recordId)
    {
        $record = ClientGstr2bRecord::where('client_profile_id', $clientId)->findOrFail($recordId);

        Storage::disk('public')->delete($record->file_path);
        $record->delete();

        return response()->json(['message' => 'Deleted']);
    }

    private function deriveFinancialYear(string $taxPeriod): string
    {
        [$year, $month] = array_map('intval', explode('-', $taxPeriod));
        $startYear = $month >= 4 ? $year : $year - 1;

        return $startYear.'-'.substr((string) ($startYear + 1), -2);
    }
}
