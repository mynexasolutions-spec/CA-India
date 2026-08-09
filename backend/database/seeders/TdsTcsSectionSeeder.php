<?php

namespace Database\Seeders;

use App\Models\TdsTcsSection;
use Illuminate\Database\Seeder;

class TdsTcsSectionSeeder extends Seeder
{
    /**
     * Starter set of commonly used TDS/TCS sections with standard rates.
     * This is a placeholder list — adjust codes/rates from Admin > TDS/TCS Sections
     * to match the firm's actual applicable sections.
     */
    public function run(): void
    {
        $rows = [
            ['type' => 'tds', 'code' => '194C', 'description' => 'Payments to Contractors', 'rate' => 1.00, 'sort_order' => 1],
            ['type' => 'tds', 'code' => '194J', 'description' => 'Professional / Technical Fees', 'rate' => 10.00, 'sort_order' => 2],
            ['type' => 'tds', 'code' => '194H', 'description' => 'Commission or Brokerage', 'rate' => 2.00, 'sort_order' => 3],
            ['type' => 'tds', 'code' => '194I(a)', 'description' => 'Rent - Plant & Machinery', 'rate' => 2.00, 'sort_order' => 4],
            ['type' => 'tds', 'code' => '194I(b)', 'description' => 'Rent - Land, Building & Furniture', 'rate' => 10.00, 'sort_order' => 5],
            ['type' => 'tds', 'code' => '194Q', 'description' => 'Purchase of Goods', 'rate' => 0.10, 'sort_order' => 6],
            ['type' => 'tcs', 'code' => '206C(1H)', 'description' => 'Sale of Goods', 'rate' => 0.10, 'sort_order' => 1],
            ['type' => 'tcs', 'code' => '206C(1)', 'description' => 'Sale of Scrap', 'rate' => 1.00, 'sort_order' => 2],
        ];

        foreach ($rows as $row) {
            TdsTcsSection::updateOrCreate(
                ['type' => $row['type'], 'code' => $row['code']],
                $row
            );
        }
    }
}
