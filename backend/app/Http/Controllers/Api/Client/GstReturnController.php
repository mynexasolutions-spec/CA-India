<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ClientGstReturn;
use App\Services\Billing\BillingPolicy;
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
     * Period grid (quarterly or monthly) for one return type, independent of any other
     * return's cycle — the due-date column selected depends only on $type.
     */
    private function buildPeriods(bool $quarterly, int $startYear, string $dueField): array
    {
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
                $day = ['due_gstr1' => 13, 'due_gstr3b' => 22, 'due_cmp08' => 18][$dueField];
                $periods[] = [
                    'period' => "{$q['year']}-Q{$q['q']}",
                    'label' => $q['label'],
                    'due_date' => $after->copy()->day($day)->toDateString(),
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
                // GSTR-1 (QRMP monthly IFF): 13th of the following month. GSTR-3B (Monthly): 20th.
                $after = \Carbon\Carbon::createFromDate($year, $month, 1)->addMonth();
                $day = $dueField === 'due_gstr3b' ? 20 : 13;
                $periods[] = [
                    'period' => sprintf('%04d-%02d', $year, $month),
                    'label' => \Carbon\Carbon::createFromDate($year, $month, 1)->format('M \'y'),
                    'due_date' => $after->copy()->day($day)->toDateString(),
                ];
            }
        }

        return $periods;
    }

    /**
     * Filing status grid across a financial year, driven entirely by the client's saved GST
     * configuration and the ClientGstReturn rows admins have marked filed. Used by the
     * dashboard's Compliance Status widget.
     *
     * - Composition dealers: a single CMP-08 row, always quarterly (the composition compliance
     *   cycle is quarterly by law, independent of gst_filing_frequency).
     * - Regular dealers: GSTR-1 and GSTR-3B are tracked on INDEPENDENT cycles — under QRMP a
     *   client may file GSTR-1 monthly (via IFF) while GSTR-3B stays quarterly, or vice versa.
     *   gst_filing_frequency drives GSTR-3B's cycle (and continues to drive the existing
     *   invoice-period-lock logic elsewhere); gstr1_filing_frequency drives GSTR-1's, falling
     *   back to gst_filing_frequency when not explicitly set.
     */
    public function compliance(Request $request)
    {
        $profile = $request->user()->clientProfile;
        abort_unless($profile, 404, 'Profile not found');
        abort_unless($profile->has_gst, 400, 'GST is not enabled on this profile');

        $startYear = $this->fyStartYear($request->input('financial_year'));
        $isComposition = $profile->dealer_type === 'composition';
        $gstr3bFrequency = $profile->gst_filing_frequency ?? 'monthly';
        $gstr1Frequency = BillingPolicy::gstr1Frequency($profile);
        $gstr3bQuarterly = $isComposition || $gstr3bFrequency === 'quarterly';
        $gstr1Quarterly = $gstr1Frequency === 'quarterly';

        $today = now()->toDateString();
        $buildRow = function (string $type, array $periods) use ($profile, $today) {
            $filedPeriods = ClientGstReturn::where('client_profile_id', $profile->id)
                ->where('return_type', $type)
                ->whereIn('tax_period', array_column($periods, 'period'))
                ->where('status', 'filed')
                ->pluck('tax_period')
                ->all();

            $rows = array_map(function ($p) use ($filedPeriods, $today) {
                $filedStatus = in_array($p['period'], $filedPeriods, true);
                // filed: admin has marked it filed. pending: due date has passed and it's
                // still not filed (overdue). upcoming: due date hasn't arrived yet.
                $status = $filedStatus ? 'filed' : ($p['due_date'] && $today > $p['due_date'] ? 'pending' : 'upcoming');

                return [
                    'period' => $p['period'],
                    'label' => $p['label'],
                    'due_date' => $p['due_date'],
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
            'dealer_type' => $profile->dealer_type,
        ];

        if ($isComposition) {
            $payload['cmp08_frequency'] = 'quarterly';
            $payload['cmp08'] = $buildRow(
                ClientGstReturn::TYPE_CMP08,
                $this->buildPeriods(true, $startYear, 'due_cmp08')
            );
        } else {
            $payload['gstr1_frequency'] = $gstr1Quarterly ? 'quarterly' : 'monthly';
            $payload['gstr3b_frequency'] = $gstr3bQuarterly ? 'quarterly' : 'monthly';
            $payload['gstr1'] = $buildRow(
                ClientGstReturn::TYPE_GSTR1,
                $this->buildPeriods($gstr1Quarterly, $startYear, 'due_gstr1')
            );
            $payload['gstr3b'] = $buildRow(
                ClientGstReturn::TYPE_GSTR3B,
                $this->buildPeriods($gstr3bQuarterly, $startYear, 'due_gstr3b')
            );
        }

        return response()->json($payload);
    }
}
