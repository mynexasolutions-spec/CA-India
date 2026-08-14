<?php

namespace App\Services\Gstr2b;

use RuntimeException;

/**
 * Parses a GSTR-2B JSON download (GST portal) into flat B2B invoice rows.
 *
 * GSTN does not publish an official JSON schema, so this defensively tries a
 * handful of known-convention key paths/aliases (cross-referenced from public
 * GSTR-2A/2B parsing tools) rather than assuming one exact shape. It fails
 * loudly (throws) only when the B2B section itself cannot be located at all —
 * individual missing fields degrade to null/0 rather than raising, since the
 * cost of a wrong number is much higher than a blank cell.
 */
class Gstr2bJsonParser
{
    /** @return array<int, array<string, mixed>> */
    public function parse(string $jsonContent): array
    {
        $data = json_decode($jsonContent, true);

        if (! is_array($data)) {
            throw new RuntimeException('This file is not valid JSON.');
        }

        $b2b = $this->firstArray($data, [
            ['data', 'docdata', 'b2b'],
            ['docdata', 'b2b'],
            ['data', 'b2b'],
            ['b2b'],
        ]);

        if ($b2b === null) {
            throw new RuntimeException('B2B section not found — this does not look like a GSTR-2B JSON file.');
        }

        $rows = [];

        foreach ($b2b as $supplier) {
            if (! is_array($supplier)) {
                continue;
            }

            $gstin = $this->firstValue($supplier, ['ctin']);
            $name = $this->firstValue($supplier, ['trdnm', 'tdname', 'cname', 'nm']);
            $invoices = $this->firstValue($supplier, ['inv', 'docs', 'doc'], []);

            foreach ((array) $invoices as $inv) {
                if (! is_array($inv)) {
                    continue;
                }

                $items = (array) $this->firstValue($inv, ['itms', 'items'], []);
                [$taxable, $cgst, $sgst, $igst, $cess] = $this->sumItems($items);

                $rows[] = [
                    'supplier_gstin' => $gstin,
                    'supplier_name' => $name,
                    'invoice_number' => $this->firstValue($inv, ['inum']),
                    'invoice_date' => $this->parseDate($this->firstValue($inv, ['idt'])),
                    'invoice_value' => (float) ($this->firstValue($inv, ['val']) ?? 0),
                    'taxable_value' => $taxable,
                    'cgst' => $cgst,
                    'sgst' => $sgst,
                    'igst' => $igst,
                    'cess' => $cess,
                    'total_gst' => $cgst + $sgst + $igst,
                    'itc_eligibility' => $this->normalizeEligibility(
                        $this->firstValue($inv, ['itcavl', 'itc_avl', 'is_itc_elg'])
                    ),
                    'itc_reason' => $this->firstValue($inv, ['rsn', 'reason']),
                ];
            }
        }

        return $rows;
    }

    /** @param array<int, array<int, string>> $paths */
    private function firstArray(array $data, array $paths): ?array
    {
        foreach ($paths as $path) {
            $node = $data;
            foreach ($path as $key) {
                if (! is_array($node) || ! array_key_exists($key, $node)) {
                    $node = null;
                    break;
                }
                $node = $node[$key];
            }
            if (is_array($node)) {
                return $node;
            }
        }

        return null;
    }

    private function firstValue(array $item, array $keys, mixed $default = null): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $item) && $item[$key] !== null && $item[$key] !== '') {
                return $item[$key];
            }
        }

        return $default;
    }

    /** @return array{0: float, 1: float, 2: float, 3: float, 4: float} */
    private function sumItems(array $items): array
    {
        $taxable = $cgst = $sgst = $igst = $cess = 0.0;

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $det = is_array($item['itm_det'] ?? null) ? $item['itm_det'] : $item;
            $taxable += (float) ($this->firstValue($det, ['txval']) ?? 0);
            $cgst += (float) ($this->firstValue($det, ['camt']) ?? 0);
            $sgst += (float) ($this->firstValue($det, ['samt']) ?? 0);
            $igst += (float) ($this->firstValue($det, ['iamt']) ?? 0);
            $cess += (float) ($this->firstValue($det, ['csamt', 'cess']) ?? 0);
        }

        return [$taxable, $cgst, $sgst, $igst, $cess];
    }

    private function parseDate(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        // GST portal dates are DD-MM-YYYY.
        if (preg_match('/^(\d{2})-(\d{2})-(\d{4})$/', $value, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }

        // Already ISO-ish (YYYY-MM-DD).
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $value;
        }

        return null;
    }

    private function normalizeEligibility(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $v = strtolower((string) $value);

        if (in_array($v, ['y', 'yes', 'true', '1', 'eligible'], true)) {
            return 'eligible';
        }

        if (in_array($v, ['n', 'no', 'false', '0', 'ineligible'], true)) {
            return 'ineligible';
        }

        return null;
    }
}
