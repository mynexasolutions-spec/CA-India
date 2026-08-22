<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientGstReturn;
use Illuminate\Http\Request;

class GstReturnController extends Controller
{
    public function index(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404, 'Profile not found');
        abort_unless($profile->has_gst, 400, 'GST is not enabled on this profile');

        $returns = ClientGstReturn::where('client_profile_id', $profile->id)
            ->orderByDesc('tax_period')
            ->get();

        $lastFiled = $returns->firstWhere('status', 'filed');

        return response()->json([
            'last_filed' => $lastFiled ? $lastFiled->tax_period : null,
            'frequency' => $profile->gst_filing_frequency ?? 'monthly',
            'dealer_type' => $profile->dealer_type,
            'returns' => $returns,
        ]);
    }

    /** Indian FY: 1 Apr – 31 Mar. e.g. "2026-27" -> starts 2026. */
    private function fyStartYear(?string $fy): int
    {
        if ($fy && preg_match('/^(\d{4})-\d{2}$/', $fy, $m)) {
            return (int) $m[1];
        }
        $now = now();

        return $now->month >= 4 ? $now->year : $now->year - 1;
    }

    /**
     * Filing status grid across a financial year, driven entirely by the client's saved GST
     * configuration and the ClientGstReturn rows admins have marked filed. Used by the
     * dashboard's Compliance Status widget.
     *
     * - Composition dealers: a single CMP-08 row, always quarterly (the composition compliance
     *   cycle is quarterly by law, independent of gst_filing_frequency).
     * - Regular dealers: GSTR-1 + GSTR-3B rows, monthly or quarterly per gst_filing_frequency.
     */
    public function compliance(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404, 'Profile not found');
        abort_unless($profile->has_gst, 400, 'GST is not enabled on this profile');

        $startYear = $this->fyStartYear($request->input('financial_year'));
        $isComposition = $profile->dealer_type === 'composition';
        $frequency = $profile->gst_filing_frequency ?? 'monthly';
        $quarterly = $isComposition || $frequency === 'quarterly';

        $periods = [];
        if ($quarterly) {
            // Indian GST quarters follow the FY: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar.
            $quarters = [
                ['q' => 1, 'year' => $startYear, 'label' => 'Apr-Jun', 'endMonth' => 6, 'endYear' => $startYear],
                ['q' => 2, 'year' => $startYear, 'label' => 'Jul-Sep', 'endMonth' => 9, 'endYear' => $startYear],
                ['q' => 3, 'year' => $startYear, 'label' => 'Oct-Dec', 'endMonth' => 12, 'endYear' => $startYear],
                ['q' => 4, 'year' => $startYear + 1, 'label' => 'Jan-Mar', 'endMonth' => 3, 'endYear' => $startYear + 1],
            ];
            foreach ($quarters as $q) {
                // GSTR-1 (QRMP): 13th of the month after the quarter. GSTR-3B (QRMP): 22nd.
                // CMP-08: 18th of the month after the quarter.
                $after = \Carbon\Carbon::createFromDate($q['endYear'], $q['endMonth'], 1)->addMonth();
                $periods[] = [
                    'period' => "{$q['year']}-Q{$q['q']}",
                    'label' => $q['label'],
                    'due_gstr1' => $after->copy()->day(13)->toDateString(),
                    'due_gstr3b' => $after->copy()->day(22)->toDateString(),
                    'due_cmp08' => $after->copy()->day(18)->toDateString(),
                ];
            }
        } else {
            for ($i = 0; $i < 12; $i++) {
                $month = 4 + $i;
                $year = $startYear;
                if ($month > 12) {
                    $month -= 12;
                    $year += 1;
                }
                // GSTR-1 (Monthly): 11th of the following month. GSTR-3B (Monthly): 20th.
                $after = \Carbon\Carbon::createFromDate($year, $month, 1)->addMonth();
                $periods[] = [
                    'period' => sprintf('%04d-%02d', $year, $month),
                    'label' => \Carbon\Carbon::createFromDate($year, $month, 1)->format('M \'y'),
                    'due_gstr1' => $after->copy()->day(11)->toDateString(),
                    'due_gstr3b' => $after->copy()->day(20)->toDateString(),
                ];
            }
        }

        $periodKeys = array_column($periods, 'period');
        $filed = ClientGstReturn::where('client_profile_id', $profile->id)
            ->whereIn('tax_period', $periodKeys)
            ->where('status', 'filed')
            ->get()
            ->groupBy('return_type')
            ->map(fn ($rows) => $rows->pluck('tax_period')->all());

        $today = now()->toDateString();
        $dueFieldFor = [
            ClientGstReturn::TYPE_GSTR1 => 'due_gstr1',
            ClientGstReturn::TYPE_GSTR3B => 'due_gstr3b',
            ClientGstReturn::TYPE_CMP08 => 'due_cmp08',
        ];
        $buildRow = function (string $type) use ($periods, $filed, $today, $dueFieldFor) {
            $filedPeriods = $filed->get($type, []);
            $dueField = $dueFieldFor[$type];
            $rows = array_map(function ($p) use ($filedPeriods, $dueField, $today) {
                $dueDate = $p[$dueField] ?? null;
                $filedStatus = in_array($p['period'], $filedPeriods, true);
                // filed: admin has marked it filed. pending: due date has passed and it's
                // still not filed (overdue). upcoming: due date hasn't arrived yet.
                $status = $filedStatus ? 'filed' : ($dueDate && $today > $dueDate ? 'pending' : 'upcoming');

                return [
                    'period' => $p['period'],
                    'label' => $p['label'],
                    'due_date' => $dueDate,
                    'status' => $status,
                ];
            }, $periods);

            return [
                'periods' => $rows,
                'filed_count' => count($filedPeriods),
                'total' => count($periods),
            ];
        };

        $payload = [
            'financial_year' => sprintf('%d-%02d', $startYear, ($startYear + 1) % 100),
            'frequency' => $quarterly ? 'quarterly' : 'monthly',
            'dealer_type' => $profile->dealer_type,
        ];

        if ($isComposition) {
            $payload['cmp08'] = $buildRow(ClientGstReturn::TYPE_CMP08);
        } else {
            $payload['gstr1'] = $buildRow(ClientGstReturn::TYPE_GSTR1);
            $payload['gstr3b'] = $buildRow(ClientGstReturn::TYPE_GSTR3B);
        }

        return response()->json($payload);
    }
}
