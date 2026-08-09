<?php

namespace App\Console\Commands;

use App\Models\HsnSacCode;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportHsnSacCodes extends Command
{
    protected $signature = 'billing:import-hsn-sac {file : Path to the government HSN_SAC.xlsx master}';

    protected $description = 'Import the official government HSN and SAC code master into hsn_sac_codes';

    /** Sheet name => code type */
    private const SHEETS = [
        'HSN_MSTR' => 'hsn',
        'SAC_MSTR' => 'sac',
    ];

    public function handle(): int
    {
        $file = $this->argument('file');

        if (! is_file($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }

        $reader = IOFactory::createReaderForFile($file);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($file);

        $imported = 0;

        foreach (self::SHEETS as $sheetName => $type) {
            $sheet = $spreadsheet->getSheetByName($sheetName);

            if (! $sheet) {
                $this->warn("Sheet {$sheetName} missing — skipped.");

                continue;
            }

            $this->info("Importing {$sheetName} as {$type}…");
            $batch = [];
            $now = now();

            foreach ($sheet->getRowIterator(2) as $row) {
                $cells = $sheet->rangeToArray(
                    'A'.$row->getRowIndex().':B'.$row->getRowIndex(),
                    null,
                    false,
                    false
                )[0] ?? [];

                $code = trim((string) ($cells[0] ?? ''));
                $description = trim((string) ($cells[1] ?? ''));

                if ($code === '') {
                    continue;
                }

                $batch[] = [
                    'type' => $type,
                    'code' => $code,
                    'description' => $description,
                    'code_length' => strlen($code),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                if (count($batch) >= 1000) {
                    $imported += $this->flush($batch);
                    $batch = [];
                }
            }

            if ($batch) {
                $imported += $this->flush($batch);
            }
        }

        $this->info("Done. {$imported} codes stored.");
        $this->line('HSN: '.HsnSacCode::where('type', 'hsn')->count());
        $this->line('SAC: '.HsnSacCode::where('type', 'sac')->count());

        return self::SUCCESS;
    }

    /** @param  array<int, array<string, mixed>>  $batch */
    private function flush(array $batch): int
    {
        DB::table('hsn_sac_codes')->upsert(
            $batch,
            ['type', 'code'],
            ['description', 'code_length', 'updated_at']
        );

        return count($batch);
    }
}
