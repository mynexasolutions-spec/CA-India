<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentLineItem extends Model
{
    protected $fillable = [
        'commercial_document_id', 'product_id', 'description', 'hsn_sac', 'qty', 'unit', 'rate',
        'discount_percent', 'discount_amount', 'gst_rate',
        'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:3',
            'rate' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'gst_rate' => 'decimal:2',
            'taxable_amount' => 'decimal:2',
            'cgst_amount' => 'decimal:2',
            'sgst_amount' => 'decimal:2',
            'igst_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }
}
