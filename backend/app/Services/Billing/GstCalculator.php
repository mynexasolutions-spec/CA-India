<?php

namespace App\Services\Billing;

class GstCalculator
{
    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @return array<string, mixed>
     */
    public static function calculate(
        array $lines,
        bool $isInterState,
        ?float $roundOff = null,
        bool $taxesEnabled = true,
        ?string $taxDeductionType = null,
        ?float $tdsTcsRate = null
    ): array {
        $taxable = 0;
        $cgst = 0;
        $sgst = 0;
        $igst = 0;
        $discountTotal = 0;
        $items = [];

        foreach ($lines as $i => $line) {
            $qty = (float) ($line['qty'] ?? 1);
            $rate = (float) ($line['rate'] ?? 0);
            $gstRate = $taxesEnabled ? (float) ($line['gst_rate'] ?? 0) : 0.0;
            $discountPercent = (float) ($line['discount_percent'] ?? 0);
            $gross = round($qty * $rate, 2);
            $discountAmount = round($gross * $discountPercent / 100, 2);
            if (isset($line['discount_amount']) && (float) $line['discount_amount'] > 0 && $discountPercent <= 0) {
                $discountAmount = round((float) $line['discount_amount'], 2);
            }
            $lineTaxable = round(max(0, $gross - $discountAmount), 2);
            $gstAmt = round($lineTaxable * $gstRate / 100, 2);

            if ($isInterState) {
                $lineCgst = 0;
                $lineSgst = 0;
                $lineIgst = $gstAmt;
            } else {
                $half = round($gstAmt / 2, 2);
                $lineCgst = $half;
                $lineSgst = $half;
                $lineIgst = 0;
            }

            $lineTotal = round($lineTaxable + $lineCgst + $lineSgst + $lineIgst, 2);
            $items[] = array_merge($line, [
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'taxable_amount' => $lineTaxable,
                'cgst_amount' => $lineCgst,
                'sgst_amount' => $lineSgst,
                'igst_amount' => $lineIgst,
                'total_amount' => $lineTotal,
                'sort_order' => $i,
            ]);
            $taxable += $lineTaxable;
            $cgst += $lineCgst;
            $sgst += $lineSgst;
            $igst += $lineIgst;
            $discountTotal += $discountAmount;
        }

        $subtotal = round($taxable + $cgst + $sgst + $igst, 2);
        $taxableRounded = round($taxable, 2);

        $tdsTcsAmount = 0.0;
        if ($taxDeductionType === 'tds' && $tdsTcsRate !== null) {
            // TDS (Income Tax) is deducted on the taxable value, excluding GST.
            $tdsTcsAmount = round($taxableRounded * $tdsTcsRate / 100, 2);
            $roundOff = 0.0;
            $grand = round($subtotal - $tdsTcsAmount, 2);
        } elseif ($taxDeductionType === 'tcs' && $tdsTcsRate !== null) {
            // TCS is collected on the GST-inclusive invoice value.
            $tdsTcsAmount = round($subtotal * $tdsTcsRate / 100, 2);
            $roundOff = 0.0;
            $grand = round($subtotal + $tdsTcsAmount, 2);
        } else {
            if ($roundOff === null) {
                $rounded = round($subtotal);
                $roundOff = round($rounded - $subtotal, 2);
            } else {
                $roundOff = round($roundOff, 2);
            }
            $grand = round($subtotal + $roundOff, 2);
        }

        return [
            'lines' => $items,
            'discount_total' => round($discountTotal, 2),
            'taxable_amount' => $taxableRounded,
            'cgst_amount' => round($cgst, 2),
            'sgst_amount' => round($sgst, 2),
            'igst_amount' => round($igst, 2),
            'total_amount' => $subtotal,
            'round_off' => $roundOff,
            'tds_tcs_amount' => $tdsTcsAmount,
            'grand_total' => $grand,
            'amount_in_words' => self::amountInWords($grand),
        ];
    }

    public static function amountInWords(float $amount): string
    {
        $rupees = (int) floor($amount);
        $paise = (int) round(($amount - $rupees) * 100);
        $words = self::numberToWords($rupees) . ' Rupees';
        if ($paise > 0) {
            $words .= ' and ' . self::numberToWords($paise) . ' Paise';
        }

        return $words . ' Only';
    }

    private static function numberToWords(int $n): string
    {
        if ($n === 0) {
            return 'Zero';
        }
        $ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        $out = '';
        if ($n >= 10000000) {
            $out .= self::numberToWords(intdiv($n, 10000000)) . ' Crore ';
            $n %= 10000000;
        }
        if ($n >= 100000) {
            $out .= self::numberToWords(intdiv($n, 100000)) . ' Lakh ';
            $n %= 100000;
        }
        if ($n >= 1000) {
            $out .= self::numberToWords(intdiv($n, 1000)) . ' Thousand ';
            $n %= 1000;
        }
        if ($n >= 100) {
            $out .= self::numberToWords(intdiv($n, 100)) . ' Hundred ';
            $n %= 100;
        }
        if ($n > 0) {
            if ($n < 20) {
                $out .= $ones[$n];
            } else {
                $out .= $tens[intdiv($n, 10)] . ($n % 10 ? ' ' . $ones[$n % 10] : '');
            }
        }

        return trim($out);
    }
}
