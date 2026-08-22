<?php

namespace App\Http\Controllers\Api\Billing;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\HsnSacCode;
use App\Models\Product;
use App\Models\TdsTcsSection;
use App\Services\Billing\BillingPolicy;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MasterController extends Controller
{
    private function profileId(Request $request): int
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 403, 'No client billing profile');

        return $profile->id;
    }

    private const GSTIN_REGEX = '/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/';

    public function parties(Request $request)
    {
        $q = Customer::where('client_profile_id', $this->profileId($request))->latest();
        if ($request->filled('q')) {
            $s = $request->q;
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%{$s}%")
                    ->orWhere('gstin', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }
        if ($request->filled('state')) {
            $q->where('state', $request->state);
        }
        if ($request->filled('gst_status')) {
            $q->where('gst_status', $request->gst_status);
        }

        return response()->json($q->paginate((int) $request->input('per_page', 10)));
    }

    private function partyRules(): array
    {
        return [
            'name' => 'required|string|max:200',
            'proprietor_name' => 'required|string|max:200',
            'contact_person' => 'nullable|string|max:120',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:20',
            'gst_status' => 'required|in:registered,unregistered',
            'gstin' => ['required_if:gst_status,registered', 'nullable', 'string', 'regex:'.self::GSTIN_REGEX],
            'state_code' => 'required|string|max:2',
            'state' => 'required|string|max:80',
            'billing_address' => 'required|string',
            'shipping_address' => 'nullable|string',
        ];
    }

    private function normalizeGstFields(array $data): array
    {
        if (($data['gst_status'] ?? null) === 'unregistered') {
            $data['gstin'] = null;
        }

        return $data;
    }

    public function storeParty(Request $request)
    {
        $data = $this->normalizeGstFields($request->validate($this->partyRules()));
        $data['client_profile_id'] = $this->profileId($request);

        return response()->json(Customer::create($data), 201);
    }

    public function updateParty(Request $request, int $id)
    {
        $c = Customer::where('client_profile_id', $this->profileId($request))->findOrFail($id);
        $data = $this->normalizeGstFields($request->validate($this->partyRules()));
        $c->update($data + $request->only(['is_active']));

        return response()->json($c);
    }

    public function showParty(Request $request, int $id)
    {
        return response()->json(
            Customer::where('client_profile_id', $this->profileId($request))->findOrFail($id)
        );
    }

    /** @deprecated alias */
    public function customers(Request $request)
    {
        return $this->parties($request);
    }

    public function storeCustomer(Request $request)
    {
        return $this->storeParty($request);
    }

    public function updateCustomer(Request $request, int $id)
    {
        return $this->updateParty($request, $id);
    }

    public function products(Request $request)
    {
        return response()->json(
            Product::where('client_profile_id', $this->profileId($request))->latest()->paginate(50)
        );
    }

    public function storeProduct(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'sku' => 'nullable|string',
            'hsn_sac' => ['nullable', 'string', Rule::exists('hsn_sac_codes', 'code')],
            'gst_rate' => ['nullable', 'numeric', Rule::in(BillingPolicy::GST_RATES)],
            'unit' => 'nullable|string',
            'sale_price' => 'nullable|numeric',
            'description' => 'nullable|string',
        ]);
        $data['client_profile_id'] = $this->profileId($request);

        return response()->json(Product::create($data), 201);
    }

    public function updateProduct(Request $request, int $id)
    {
        $p = Product::where('client_profile_id', $this->profileId($request))->findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string',
            'sku' => 'nullable|string',
            'hsn_sac' => ['nullable', 'string', Rule::exists('hsn_sac_codes', 'code')],
            'gst_rate' => ['nullable', 'numeric', Rule::in(BillingPolicy::GST_RATES)],
            'unit' => 'nullable|string',
            'sale_price' => 'nullable|numeric',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);
        $p->update($data);

        return response()->json($p);
    }

    /**
     * Search the official government HSN / SAC master.
     * Only codes present here may be used on documents.
     */
    public function hsnSacCodes(Request $request)
    {
        $search = trim((string) $request->input('q', ''));
        $type = $request->input('type');

        $query = HsnSacCode::query();

        if (in_array($type, ['hsn', 'sac'], true)) {
            $query->where('type', $type);
        }

        if ($search !== '') {
            $query->where(function ($w) use ($search) {
                $w->where('code', 'like', $search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
            // Exact-prefix code matches first, then shortest (chapter-level) codes.
            $query->orderByRaw('CASE WHEN code LIKE ? THEN 0 ELSE 1 END', [$search.'%']);
        }

        $rows = $query->orderBy('code_length')
            ->orderBy('code')
            ->limit(40)
            ->get(['type', 'code', 'description']);

        return response()->json(['data' => $rows]);
    }

    /** Active TDS/TCS sections for the create-document dropdown. */
    public function tdsTcsSections(Request $request)
    {
        $type = $request->input('type');
        $q = TdsTcsSection::where('is_active', true)->orderBy('sort_order')->orderBy('code');
        if (in_array($type, ['tds', 'tcs'], true)) {
            $q->where('type', $type);
        }

        return response()->json(['data' => $q->get(['id', 'type', 'code', 'description', 'rate'])]);
    }

    /** Validate a single code against the government master. */
    public function verifyHsnSac(Request $request)
    {
        $code = trim((string) $request->input('code', ''));
        $row = $code === '' ? null : HsnSacCode::where('code', $code)->first(['type', 'code', 'description']);

        return response()->json([
            'valid' => (bool) $row,
            'match' => $row,
        ]);
    }
}
