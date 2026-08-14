<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HsnSacCode;
use App\Models\TdsTcsSection;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MasterConfigController extends Controller
{
    // ==========================================
    // HSN / SAC CODES
    // ==========================================

    public function hsnSacList(Request $request)
    {
        $q = HsnSacCode::query();
        if ($request->filled('type')) {
            $q->where('type', $request->type);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $q->where(function ($w) use ($s) {
                $w->where('code', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }
        return response()->json($q->orderBy('code')->paginate((int) $request->input('per_page', 20)));
    }

    public function hsnSacStore(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['hsn', 'sac'])],
            'code' => ['required', 'string', 'max:15', 'unique:hsn_sac_codes,code'],
            'description' => ['required', 'string'],
        ]);
        $data['code_length'] = strlen($data['code']);
        
        return response()->json(HsnSacCode::create($data), 201);
    }

    public function hsnSacUpdate(Request $request, int $id)
    {
        $record = HsnSacCode::findOrFail($id);
        $data = $request->validate([
            'type' => ['required', Rule::in(['hsn', 'sac'])],
            'code' => ['required', 'string', 'max:15', Rule::unique('hsn_sac_codes', 'code')->ignore($id)],
            'description' => ['required', 'string'],
        ]);
        $data['code_length'] = strlen($data['code']);
        $record->update($data);

        return response()->json($record);
    }

    public function hsnSacDestroy(int $id)
    {
        HsnSacCode::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    // ==========================================
    // TDS / TCS SECTIONS
    // ==========================================

    public function tdsTcsList(Request $request)
    {
        $q = TdsTcsSection::query();
        if ($request->filled('type')) {
            $q->where('type', $request->type);
        }
        return response()->json($q->orderBy('sort_order')->orderBy('code')->paginate((int) $request->input('per_page', 20)));
    }

    public function tdsTcsStore(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['tds', 'tcs'])],
            'code' => ['required', 'string', 'max:20', 'unique:tds_tcs_sections,code'],
            'description' => ['required', 'string'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);
        
        $data['is_active'] = $data['is_active'] ?? true;
        $data['sort_order'] = $data['sort_order'] ?? 0;

        return response()->json(TdsTcsSection::create($data), 201);
    }

    public function tdsTcsUpdate(Request $request, int $id)
    {
        $record = TdsTcsSection::findOrFail($id);
        $data = $request->validate([
            'type' => ['required', Rule::in(['tds', 'tcs'])],
            'code' => ['required', 'string', 'max:20', Rule::unique('tds_tcs_sections', 'code')->ignore($id)],
            'description' => ['required', 'string'],
            'rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer'],
        ]);

        $data['is_active'] = $data['is_active'] ?? true;
        $data['sort_order'] = $data['sort_order'] ?? 0;
        $record->update($data);

        return response()->json($record);
    }

    public function tdsTcsDestroy(int $id)
    {
        TdsTcsSection::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }
}
