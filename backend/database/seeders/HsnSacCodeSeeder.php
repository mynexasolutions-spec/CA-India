<?php

namespace Database\Seeders;

use App\Models\HsnSacCode;
use Illuminate\Database\Seeder;

class HsnSacCodeSeeder extends Seeder
{
    /**
     * Small starter master for the HSN / SAC dropdown.
     * This is intentionally focused on common invoice items so the picker works
     * out of the box in demo/client environments.
     */
    public function run(): void
    {
        $rows = [
            ['type' => 'hsn', 'code' => '9403', 'description' => 'Other furniture and parts thereof, including tables, desks and cabinets'],
            ['type' => 'hsn', 'code' => '9401', 'description' => 'Seats (other than those of heading 9402), whether or not convertible into beds'],
            ['type' => 'hsn', 'code' => '8471', 'description' => 'Automatic data processing machines and units thereof; computers and laptops'],
            ['type' => 'hsn', 'code' => '8517', 'description' => 'Telephone sets, smartphones and communication apparatus'],
            ['type' => 'hsn', 'code' => '8528', 'description' => 'Monitors and projectors, not incorporating television reception apparatus'],
            ['type' => 'hsn', 'code' => '8536', 'description' => 'Electrical apparatus for switching or protecting electrical circuits'],
            ['type' => 'hsn', 'code' => '8544', 'description' => 'Insulated wire, cable and other insulated electric conductors'],
            ['type' => 'hsn', 'code' => '2106', 'description' => 'Food preparations not elsewhere specified or included'],
            ['type' => 'hsn', 'code' => '3304', 'description' => 'Beauty or make-up preparations and skincare products'],
            ['type' => 'hsn', 'code' => '3305', 'description' => 'Preparations for use on the hair'],
            ['type' => 'hsn', 'code' => '3306', 'description' => 'Preparations for oral or dental hygiene'],
            ['type' => 'hsn', 'code' => '3401', 'description' => 'Soap and organic surface-active products'],
            ['type' => 'hsn', 'code' => '3926', 'description' => 'Other articles of plastics'],
            ['type' => 'hsn', 'code' => '4202', 'description' => 'Trunks, suitcases, handbags and similar containers'],
            ['type' => 'hsn', 'code' => '4818', 'description' => 'Paper, paperboard and articles of paper pulp'],
            ['type' => 'hsn', 'code' => '6109', 'description' => 'T-shirts, singlets and other vests, knitted or crocheted'],
            ['type' => 'hsn', 'code' => '6205', 'description' => 'Men or boys shirts'],
            ['type' => 'hsn', 'code' => '6302', 'description' => 'Bed linen, table linen, toilet linen and kitchen linen'],
            ['type' => 'hsn', 'code' => '7214', 'description' => 'Iron or non-alloy steel bars and rods'],
            ['type' => 'hsn', 'code' => '7308', 'description' => 'Structures and parts of structures of iron or steel'],
            ['type' => 'hsn', 'code' => '8418', 'description' => 'Refrigerators, freezers and other refrigerating equipment'],
            ['type' => 'hsn', 'code' => '8504', 'description' => 'Electrical transformers, static converters and inductors'],
            ['type' => 'hsn', 'code' => '8507', 'description' => 'Electric accumulators and batteries'],
            ['type' => 'sac', 'code' => '998311', 'description' => 'Legal services'],
            ['type' => 'sac', 'code' => '998312', 'description' => 'Accounting, auditing and bookkeeping services'],
            ['type' => 'sac', 'code' => '998313', 'description' => 'Tax consulting and preparation services'],
            ['type' => 'sac', 'code' => '998314', 'description' => 'Business consulting and management services'],
            ['type' => 'sac', 'code' => '998315', 'description' => 'Architectural services'],
            ['type' => 'sac', 'code' => '998316', 'description' => 'Engineering services'],
            ['type' => 'sac', 'code' => '998319', 'description' => 'Other professional, technical and business services'],
            ['type' => 'sac', 'code' => '998421', 'description' => 'Information technology consulting and support services'],
            ['type' => 'sac', 'code' => '998431', 'description' => 'Advertising services'],
            ['type' => 'sac', 'code' => '998522', 'description' => 'Cleaning services'],
        ];

        foreach ($rows as $row) {
            HsnSacCode::updateOrCreate(
                ['type' => $row['type'], 'code' => $row['code']],
                [
                    'description' => $row['description'],
                    'code_length' => strlen($row['code']),
                ]
            );
        }
    }
}