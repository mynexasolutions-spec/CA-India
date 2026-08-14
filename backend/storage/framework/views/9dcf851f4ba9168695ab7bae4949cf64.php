<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page { margin: 8mm 10mm 12mm 10mm; size: A4 portrait; }
* { box-sizing: border-box; }
body {
  font-family: DejaVu Sans, sans-serif;
  font-size: 11px;
  color: #0f172a;
  margin: 0;
  padding: 0;
  line-height: 1.32;
}
table { width: 100%; border-collapse: collapse; }
td, th { vertical-align: top; }

/* Page frame is drawn per-page on the canvas (InvoiceService); this only pads content */
.frame {
  padding: 8px 4px 0;
}
.col-spacer { width: 16px; }
.right { text-align: right; }
.center { text-align: center; }

/* ===== Header ===== */
.company-name {
  font-size: 18.5px;
  font-weight: bold;
  color: #1e40af;
  margin: 0 0 5px;
  line-height: 1.15;
}
.logo-cell {
  width: 112px;
  padding-right: 10px;
  padding-left: 2px;
  vertical-align: middle;
}
.logo-img {
  width: 100px;
  height: auto;
  display: block;
}
.meta-row { margin: 3.5px 0; }
.meta-row td { padding: 0; vertical-align: middle; }
.meta-icon-cell { width: 16px; }
.meta-icon-cell img { width: 11px; height: 11px; display: block; }
.meta-text { color: #475569; font-size: 9.5px; line-height: 1.4; }
.meta-text b { color: #1e293b; font-weight: bold; }

.doc-title {
  display: inline-block;
  background: #1e40af;
  color: #ffffff;
  font-size: 17px;
  font-weight: bold;
  margin: 0 0 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-decoration: none;
  text-align: center;
  padding: 7px 18px;
  border-radius: 8px;
}
.inv-meta { width: 100%; }
.inv-meta td { padding: 2.5px 0; font-size: 10px; }
.inv-meta .lab { width: 104px; color: #334155; font-weight: bold; text-align: left; white-space: nowrap; }
.inv-meta .colon { width: 10px; color: #334155; font-weight: bold; text-align: center; }
.inv-meta .val { color: #0f172a; text-align: left; white-space: nowrap; font-weight: bold; padding-left: 4px; }
.inv-meta .val-plain { color: #0f172a; text-align: left; white-space: nowrap; font-weight: bold; padding-left: 4px; }

.hdr-rule { border: 0; border-top: 1.4px solid #1e40af; margin: 6px 0 12px; }

/* ===== Receiver / Consignee ===== */
.party-wrap { margin-top: 0; }
.party-cell {
  width: 48%;
  padding: 0;
  vertical-align: top;
}
.party-box {
  border: 1.2px solid #1e40af;
  border-radius: 11px;
}
.party-head {
  background: #1e40af;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: bold;
  letter-spacing: 0.35px;
  text-transform: uppercase;
  padding: 7px 12px;
  border-radius: 9px 9px 0 0;
}
.party-body { padding: 10px 12px; background: #ffffff; border-radius: 0 0 9px 9px; }
.party-name { font-weight: bold; font-size: 11.5px; color: #0f172a; margin-bottom: 5px; }
.party-line { color: #334155; font-size: 9.8px; margin: 2px 0; }
.party-line b { color: #0f172a; }
.party-fields td { padding: 2px 0; font-size: 9.8px; color: #334155; }
.pf-lab { width: 60px; font-weight: bold; color: #0f172a; white-space: nowrap; }
.pf-colon { width: 8px; color: #0f172a; font-weight: bold; }
.pf-val { padding-left: 4px; color: #334155; }

/* ===== Line items ===== */
.items-wrap { margin-top: 14px; border: 1.5px solid #1e40af; border-radius: 10px; }
.items { width: 100%; table-layout: fixed; }
.items th {
  background: #1e40af;
  color: #ffffff;
  font-size: 8.5px;
  font-weight: bold;
  padding: 8px 5px;
  text-align: center;
  text-transform: uppercase;
  line-height: 1.3;
  border-right: 1px solid #3d5cc4;
}
.items th:last-child { border-right: 0; }
.items th:first-child { border-top-left-radius: 9px; }
.items th:last-child { border-top-right-radius: 9px; }
.items td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #eef2f7;
  padding: 7px 6px;
  font-size: 9.8px;
  color: #334155;
  vertical-align: top;
  text-align: center;
  word-break: break-word;
}
.items tr { page-break-inside: avoid; }
.items tr:last-child td { border-bottom: 0; }
.items td:last-child { border-right: 0; }
.items .amt { color: #0f172a; font-weight: bold; text-align: center; white-space: nowrap; }
.items .qty-num { color: #0f172a; font-weight: bold; white-space: nowrap; }
.item-title { font-weight: bold; color: #0f172a; font-size: 10.3px; text-align: center; }
.item-sub { color: #64748b; font-size: 8.3px; margin-top: 1px; text-align: center; }

/* ===== Summary: floated columns so cards can flow page by page ===== */
.summary-flow { margin-top: 14px; }
.sum-left { float: left; width: 48.5%; }
.sum-right { float: right; width: 48.5%; }
.clear { clear: both; }

.card { border: 1px solid #1e40af; border-radius: 10px; background: #ffffff; padding: 9px 12px; page-break-inside: avoid; }
.card-gap { margin-top: 12px; }
.card-head { font-weight: bold; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.3px; color: #1e40af; }
.card-head img { width: 14px; height: 14px; vertical-align: -2.5px; margin-right: 6px; }
.card-sep { border-top: 1px dashed #bcd0ee; margin: 6px 0; }

.words-value { display: block; font-style: normal; font-size: 10.3px; color: #0f172a; font-weight: bold; line-height: 1.4; }

.bank-name { display: inline; font-weight: bold; color: #0f172a; font-size: 9.3px; margin: 0; }
.bank-line { color: #1e293b; font-size: 9.3px; line-height: 1.55; }
.terms-list { margin: 0; padding-left: 15px; color: #1e293b; font-size: 9.3px; line-height: 1.55; }
.terms-list li { margin-bottom: 1px; }

.totals-cell { border: 1.2px solid #1e40af; border-radius: 11px; padding: 0; vertical-align: top; page-break-inside: avoid; }
.totals td { padding: 7px 11px; font-size: 10.3px; border-bottom: 1px solid #e2e8f0; font-weight: normal; }
.totals .lab { color: #475569; }
.totals .val { text-align: right; color: #0f172a; white-space: nowrap; }
.totals tr:last-child td { border-bottom: 0; }
.grand-row td {
  background: #dcfce7;
  border-bottom: 0 !important;
  border-top: 2px solid #16a34a;
  padding: 8px 11px;
  color: #0f172a;
  font-size: 12px;
  font-weight: bold;
}
.grand-row td:first-child { border-bottom-left-radius: 9px; }
.grand-row td:last-child { border-bottom-right-radius: 9px; }
.grand-row .amt { text-align: right; color: #0f172a; font-size: 13px; }
.tds-row .lab, .tds-row .val { color: #b91c1c; }
.tcs-row .lab, .tcs-row .val { color: #15803d; }
.post-gst-row .lab, .post-gst-row .val { color: #1e40af; }

.rcm-stamp {
  margin-top: 12px;
  border: 1px solid #1e40af;
  border-radius: 8px;
  color: #1e40af;
  font-weight: bold;
  font-size: 10px;
  padding: 5px 7px;
  text-align: center;
}

/* Seal + signature — unboxed, side by side, filling the caption width */
.seal-sign-wrap { margin-top: 34px; page-break-inside: avoid; }
.sign-block { width: auto; }
.sign-for { font-size: 12.5px; font-weight: bold; color: #1e40af; text-align: right; padding-bottom: 7px; white-space: nowrap; }
.seal-cell-plain { width: 70px; vertical-align: bottom; text-align: left; }
.seal-img { max-height: 68px; max-width: 68px; display: block; }
.sign-plain { vertical-align: bottom; text-align: right; }
.sign-img { max-height: 30px; max-width: 100px; margin-bottom: 2px; }
.sign-name { font-size: 11px; font-weight: bold; color: #1e40af; margin-top: 2px; }
.sign-role { font-size: 8.8px; color: #64748b; margin-top: 2px; font-weight: bold; }

</style>
</head>
<body>
<?php
  $p = $doc->clientProfile;
  $c = $doc->customer;
  $phone = $p->mobile ?: ($p->user?->phone ?? null);
  $email = $p->email ?: ($p->user?->email ?? null);
  $business = $p->business_name ?: ($p->client_name ?: 'Business');
  $docTitle = match ($doc->type) {
    'bill_of_supply' => 'BILL OF SUPPLY',
    'credit_note' => 'CREDIT NOTE',
    'debit_note' => 'DEBIT NOTE',
    'quotation' => 'QUOTATION',
    'amendment' => 'AMENDMENT',
    'proforma' => 'PROFORMA INVOICE',
    'delivery_challan' => 'DELIVERY CHALLAN',
    default => 'TAX INVOICE',
  };
  if ($doc->type === 'tax_invoice' && ! $p->has_gst) {
    $docTitle = 'BILL / RECEIPT';
  }
  $showTax = $p->has_gst && $p->dealer_type !== 'composition';
  $isRcm = (bool) $doc->is_reverse_charge;
  $grand = $doc->grand_total ?: $doc->total_amount;
  $cgstRate = null;
  $sgstRate = null;
  $igstRate = null;
  foreach ($doc->lineItems as $line) {
    if ($line->gst_rate > 0) {
      if ($doc->is_inter_state) {
        $igstRate = $line->gst_rate;
      } else {
        $half = round(((float) $line->gst_rate) / 2, 2);
        $cgstRate = $half;
        $sgstRate = $half;
      }
      break;
    }
  }
  $fmtRate = function ($r) {
    if ($r === null) return '';
    return rtrim(rtrim(number_format((float) $r, 2), '0'), '.');
  };
  $billAddr = $c?->billing_address;
  $shipAddr = $c?->shipping_address ?: $billAddr;
  $customerLabel = trim(($c?->name ?? '') . ($c?->phone ? ' ('.$c->phone.')' : ($c?->contact_person ? ' ('.$c->contact_person.')' : '')));
  $stateLine = function ($state, $code) {
    if ($state && $code) return $state.' (State Code: '.$code.')';
    if ($state) return $state;
    if ($code) return 'State Code: '.$code;
    return '';
  };
  $billStateLine = $stateLine($c?->state, $c?->state_code);
  $shipStateLine = $doc->is_inter_state && filled($doc->place_of_supply)
    ? $doc->place_of_supply
    : $billStateLine;
  $pos = trim((string) ($doc->place_of_supply ?: ''));
  if ($pos === '') {
    $posLine = '—';
  } elseif (preg_match('/\(\s*\d{1,2}\s*\)/', $pos) || stripos($pos, 'state code') !== false) {
    $posLine = $pos;
  } elseif ($c?->state_code && $c?->state && stripos($pos, (string) $c->state) !== false) {
    $posLine = $c->state.' ('.$c->state_code.')';
  } elseif ($p->state_code && $p->state && stripos($pos, (string) $p->state) !== false) {
    $posLine = $p->state.' ('.$p->state_code.')';
  } else {
    $posLine = $pos;
  }
  $addressParts = array_filter([
    $p->address,
    $p->city,
    trim(($p->state ?: '').($p->pincode ? ' - '.$p->pincode : '')),
  ], fn ($part) => filled($part));
  $asset = fn ($name) => public_path('pdf-assets/'.$name);
  $logoPath = ($p->logo_path && file_exists(public_path('storage/'.$p->logo_path)))
    ? public_path('storage/'.$p->logo_path)
    : (file_exists($asset('website-logo.png')) ? $asset('website-logo.png') : null);
  $sigPath = ($p->signature_path && file_exists(public_path('storage/'.$p->signature_path))) ? public_path('storage/'.$p->signature_path) : null;
  $sealPath = ($p->seal_path && file_exists(public_path('storage/'.$p->seal_path))) ? public_path('storage/'.$p->seal_path) : null;
  $hasBank = filled($p->bank_name) || filled($p->bank_account) || filled($p->bank_ifsc) || filled($p->upi_id);
  $bankIcon = file_exists($asset('icon-bank.png')) ? $asset('icon-bank.png') : null;
  $termsIcon = file_exists($asset('icon-terms.png')) ? $asset('icon-terms.png') : null;
  $rupeeIcon = file_exists($asset('icon-rupee.png')) ? $asset('icon-rupee.png') : null;
  $pinIcon = file_exists($asset('icon-pin.png')) ? $asset('icon-pin.png') : null;
  $gstinIcon = file_exists($asset('icon-gstin.png')) ? $asset('icon-gstin.png') : null;
  $emailIcon = file_exists($asset('icon-email.png')) ? $asset('icon-email.png') : null;
  $phoneIcon = file_exists($asset('icon-phone.png')) ? $asset('icon-phone.png') : null;

  $termsSource = $doc->terms ?: ($p->terms_conditions ?: '');
  $termsLines = [];
  if ($doc->payment_terms) {
    $termsLines[] = $doc->payment_terms;
  }
  if ($termsSource) {
    foreach (preg_split("/\r\n|\n|\r/", (string) $termsSource) as $line) {
      $line = trim(preg_replace('/^\d+[\.\)]\s*/', '', $line));
      if ($line !== '') $termsLines[] = $line;
    }
  }
  if (! $termsLines) {
    $termsLines = [
      'Payment is expected within 7 days from the invoice issuance date.',
      'Interest @ 18% per annum will be charged on overdue payments.',
      'All disputes are subject to Mumbai Jurisdiction.',
    ];
  }

  $splitDesc = function ($desc) {
    $parts = preg_split("/\r\n|\n|\r/", (string) $desc, 2);
    $title = trim($parts[0] ?? '');
    $sub = trim($parts[1] ?? '');
    return [$title ?: 'Item', $sub];
  };

  $metaLabel = match ($doc->type) {
    'quotation' => 'Quotation',
    'credit_note' => 'Credit Note',
    'debit_note' => 'Debit Note',
    'proforma' => 'Proforma',
    'amendment' => 'Amendment',
    'delivery_challan' => 'Challan',
    'bill_of_supply' => 'Bill',
    default => 'Tax Invoice',
  };
  if ($doc->type === 'tax_invoice' && ! $p->has_gst) {
    $metaLabel = 'Bill';
  }

  $wordsRaw = trim((string) ($doc->amount_in_words ?: ''));
  if ($wordsRaw === '') {
    $wordsDisplay = '—';
  } else {
    $core = preg_replace('/\s*Only\.?$/i', '', $wordsRaw);
    $core = preg_replace('/\s*Rupees?\s*/i', ' ', $core);
    $core = trim(preg_replace('/\s+/', ' ', $core));
    $wordsDisplay = 'Rupees '.$core.' Only.';
  }

  $colSno = 6;
  $colHsn = ($showTax || $p->has_gst) ? 8 : 0;
  $colQty = 6;
  $colRate = 7;
  $colDisc = 6;
  $colTaxable = 12;
  $colTax = $showTax ? 17 : 0;
  $colTotal = 10;
  $colDesc = 100 - $colSno - $colHsn - $colQty - $colRate - $colDisc - $colTaxable - $colTax - $colTotal;
  $showSplitTax = $showTax && ! $doc->is_inter_state;

  $roundOffVal = (float) $doc->round_off;
  $roundOffDisplay = ($roundOffVal < 0 ? '- ' : '').'&#8377; '.number_format(abs($roundOffVal), 0);

  $totalCols = 6 + ($colHsn ? 1 : 0) + ($showTax ? 1 : 0);
?>

<div class="frame">


<table>
  <tr>
    <td style="width:60%;">
      <table>
        <tr>
          <?php if($logoPath): ?>
          <td class="logo-cell">
            <img class="logo-img" src="<?php echo e($logoPath); ?>" alt="logo">
          </td>
          <?php endif; ?>
          <td>
            <div class="company-name"><?php echo e(strtoupper($business)); ?></div>

            <table class="meta-row"><tr>
              <td class="meta-icon-cell"><?php if($pinIcon): ?><img src="<?php echo e($pinIcon); ?>" alt=""><?php endif; ?></td>
              <td class="meta-text"><?php echo e(implode(', ', $addressParts) ?: '—'); ?></td>
            </tr></table>

            <?php if(($p->has_gst && $p->gstin) || $p->pan): ?>
            <table class="meta-row"><tr>
              <td class="meta-icon-cell"><?php if($gstinIcon): ?><img src="<?php echo e($gstinIcon); ?>" alt=""><?php endif; ?></td>
              <td class="meta-text">
                <?php if($p->has_gst && $p->gstin): ?><b>GSTIN :</b> <?php echo e($p->gstin); ?><?php endif; ?>
                <?php if($p->pan): ?><?php echo e(($p->has_gst && $p->gstin) ? '  |  ' : ''); ?><b>PAN :</b> <?php echo e($p->pan); ?><?php endif; ?>
              </td>
            </tr></table>
            <?php endif; ?>

            <?php if($email): ?>
            <table class="meta-row"><tr>
              <td class="meta-icon-cell"><?php if($emailIcon): ?><img src="<?php echo e($emailIcon); ?>" alt=""><?php endif; ?></td>
              <td class="meta-text"><b>Email :</b> <?php echo e($email); ?></td>
            </tr></table>
            <?php endif; ?>

            <?php if($phone): ?>
            <table class="meta-row"><tr>
              <td class="meta-icon-cell"><?php if($phoneIcon): ?><img src="<?php echo e($phoneIcon); ?>" alt=""><?php endif; ?></td>
              <td class="meta-text"><b>Phone :</b> <?php echo e($phone); ?></td>
            </tr></table>
            <?php endif; ?>

            <?php if($p->state || $p->state_code): ?>
            <table class="meta-row"><tr>
              <td class="meta-icon-cell"><?php if($pinIcon): ?><img src="<?php echo e($pinIcon); ?>" alt=""><?php endif; ?></td>
              <td class="meta-text"><b>State :</b> <?php echo e($stateLine($p->state, $p->state_code)); ?></td>
            </tr></table>
            <?php endif; ?>
          </td>
        </tr>
      </table>
    </td>
    <td class="col-spacer"></td>
    <td style="width:37%;" class="right">
      <div class="doc-title"><?php echo e($docTitle); ?></div>
      <table class="inv-meta">
        <tr>
          <td class="lab"><?php echo e($metaLabel); ?> No.</td>
          <td class="colon">:</td>
          <td class="val"><?php echo e($doc->number); ?></td>
        </tr>
        <tr>
          <td class="lab"><?php echo e($metaLabel); ?> Date</td>
          <td class="colon">:</td>
          <td class="val-plain"><?php echo e($doc->document_date?->format('d-m-Y')); ?></td>
        </tr>
        <tr>
          <td class="lab">Place of Supply</td>
          <td class="colon">:</td>
          <td class="val-plain"><?php echo e($posLine); ?></td>
        </tr>
        <tr>
          <td class="lab">Reverse Charge</td>
          <td class="colon">:</td>
          <td class="val-plain"><?php echo e($isRcm ? 'Yes' : 'No'); ?></td>
        </tr>
        <?php if($doc->referenceDocument): ?>
        <tr>
          <td class="lab">Against</td>
          <td class="colon">:</td>
          <td class="val"><?php echo e($doc->referenceDocument->number); ?></td>
        </tr>
        <?php endif; ?>
      </table>
    </td>
  </tr>
</table>

<hr class="hdr-rule">


<table class="party-wrap">
  <tr>
    <td class="party-cell">
      <div class="party-box">
      <div class="party-head">Details of Receiver | Bill To</div>
      <div class="party-body">
        <?php if($c): ?>
          <div class="party-name"><?php echo e($customerLabel ?: '—'); ?></div>
          <table class="party-fields">
            <tr><td class="pf-lab">Name</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($c->name ?: '—'); ?></td></tr>
            <?php if($billAddr): ?><tr><td class="pf-lab">Address</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($billAddr); ?></td></tr><?php endif; ?>
            <tr><td class="pf-lab">GSTIN</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($c->gstin_display); ?></td></tr>
            <?php if($billStateLine): ?><tr><td class="pf-lab">State</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($billStateLine); ?></td></tr><?php endif; ?>
            <?php if($c->phone): ?><tr><td class="pf-lab">Mobile</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($c->phone); ?></td></tr><?php endif; ?>
          </table>
        <?php else: ?>
          <div class="party-line">—</div>
        <?php endif; ?>
      </div>
      </div>
    </td>
    <td class="col-spacer"></td>
    <td class="party-cell">
      <div class="party-box">
      <div class="party-head">Details of Consignee | Ship To</div>
      <div class="party-body">
        <?php if($c): ?>
          <div class="party-name"><?php echo e($customerLabel ?: '—'); ?></div>
          <table class="party-fields">
            <tr><td class="pf-lab">Name</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($c->name ?: '—'); ?></td></tr>
            <?php if($shipAddr): ?><tr><td class="pf-lab">Address</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($shipAddr); ?></td></tr><?php endif; ?>
            <tr><td class="pf-lab">GSTIN</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($c->gstin_display); ?></td></tr>
            <?php if($shipStateLine): ?><tr><td class="pf-lab">State</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($shipStateLine); ?></td></tr><?php endif; ?>
            <?php if($c->phone): ?><tr><td class="pf-lab">Mobile</td><td class="pf-colon">:</td><td class="pf-val"><?php echo e($c->phone); ?></td></tr><?php endif; ?>
          </table>
        <?php else: ?>
          <div class="party-line">—</div>
        <?php endif; ?>
      </div>
      </div>
    </td>
  </tr>
</table>


<div class="items-wrap">
<table class="items">
  <thead>
    <tr>
      <th style="width:<?php echo e($colSno); ?>%;">S.No.</th>
      <th style="width:<?php echo e($colDesc); ?>%;">Product / Service<br>Dis.</th>
      <?php if($colHsn): ?>
      <th style="width:<?php echo e($colHsn); ?>%;">HSN /<br>SAC</th>
      <?php endif; ?>
      <th style="width:<?php echo e($colQty); ?>%;">Qty</th>
      <th style="width:<?php echo e($colRate); ?>%;">Rate<br>(&#8377;)</th>
      <th style="width:<?php echo e($colDisc); ?>%;">Disc<br>(&#8377;)</th>
      <th style="width:<?php echo e($colTaxable); ?>%;">Taxable Value<br>(&#8377;)</th>
      <?php if($showTax): ?>
        <?php if($showSplitTax): ?>
      <th style="width:<?php echo e($colTax / 2); ?>%;">CGST<br>(&#8377;)</th>
      <th style="width:<?php echo e($colTax / 2); ?>%;">SGST<br>(&#8377;)</th>
        <?php else: ?>
      <th style="width:<?php echo e($colTax); ?>%;">IGST<br>(&#8377;)</th>
        <?php endif; ?>
      <?php endif; ?>
      <th style="width:<?php echo e($colTotal); ?>%;">Total<br>(&#8377;)</th>
    </tr>
  </thead>
  <tbody>
    <?php $__empty_1 = true; $__currentLoopData = $doc->lineItems; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
      <?php [$title, $sub] = $splitDesc($item->description); ?>
      <tr>
        <td class="center"><strong><?php echo e($i + 1); ?></strong></td>
        <td>
          <div class="item-title"><?php echo e($title); ?></div>
          <?php if($sub): ?><div class="item-sub"><?php echo e($sub); ?></div><?php endif; ?>
        </td>
        <?php if($colHsn): ?>
        <td class="center"><strong><?php echo e($item->hsn_sac ?: '—'); ?></strong></td>
        <?php endif; ?>
        <td class="center">
          <span class="qty-num"><?php echo e(number_format((float) $item->qty, 0)); ?></span>
          <div style="font-size:8.5px;color:#64748b;"><?php echo e(strtoupper($item->unit ?: 'NOS')); ?></div>
        </td>
        <td class="amt"><?php echo e(number_format((float) $item->rate, 0)); ?></td>
        <td class="amt"><?php echo e(number_format((float) $item->discount_amount, 0)); ?></td>
        <td class="amt"><?php echo e(number_format((float) $item->taxable_amount, 0)); ?></td>
        <?php if($showTax): ?>
          <?php if($showSplitTax): ?>
        <td class="amt"><?php echo e(number_format((float) $item->cgst_amount, 0)); ?></td>
        <td class="amt"><?php echo e(number_format((float) $item->sgst_amount, 0)); ?></td>
          <?php else: ?>
        <td class="amt"><?php echo e(number_format((float) $item->igst_amount, 0)); ?></td>
          <?php endif; ?>
        <?php endif; ?>
        <td class="amt"><?php echo e(number_format((float) $item->total_amount, 0)); ?></td>
      </tr>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
      <tr><td colspan="<?php echo e($totalCols); ?>" class="center" style="color:#94a3b8;">No line items</td></tr>
    <?php endif; ?>
  </tbody>
</table>
</div>


<div class="summary-flow">
    <div class="sum-left">
      <div class="card">
        <div class="card-head">
          <?php if($rupeeIcon): ?><img src="<?php echo e($rupeeIcon); ?>" alt="Rs"><?php endif; ?>
          Amount in Words
        </div>
        <div class="card-sep"></div>
        <span class="words-value"><?php echo e($wordsDisplay); ?></span>
      </div>

      <div class="card card-gap">
        <?php if($hasBank): ?>
          <div class="card-head">
            <?php if($bankIcon): ?><img src="<?php echo e($bankIcon); ?>" alt=""><?php endif; ?>
            Bank Details (For RTGS/NEFT Transfers)
          </div>
          <div class="card-sep"></div>
          <div class="bank-line"><b>Bank Name :</b> <span class="bank-name"><?php echo e($p->bank_name ?: '—'); ?></span></div>
          <div class="bank-line">
            <?php if($p->account_holder_name): ?>Account Name : <?php echo e($p->account_holder_name); ?><br><?php endif; ?>
            Account Number : <?php echo e($p->bank_account ?: '—'); ?><?php if($p->bank_ifsc): ?> &nbsp;|&nbsp; IFSC Code : <?php echo e($p->bank_ifsc); ?><?php endif; ?>
            <?php if($p->bank_branch): ?><br>Branch : <?php echo e($p->bank_branch); ?><?php endif; ?>
            <?php if($p->upi_id): ?><br>UPI ID : <?php echo e($p->upi_id); ?><?php endif; ?>
          </div>
        <?php endif; ?>
      </div>

      <div class="card card-gap">
        <div class="card-head">
          <?php if($termsIcon): ?><img src="<?php echo e($termsIcon); ?>" alt=""><?php endif; ?>
          Terms and Conditions
        </div>
        <div class="card-sep"></div>
        <ol class="terms-list">
          <?php $__currentLoopData = $termsLines; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $t): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <li><?php echo e($t); ?></li>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </ol>
      </div>
    </div>
    <div class="sum-right">
      <div class="totals-cell">
        <table class="totals">
          <tr>
            <td class="lab">Total Taxable Value</td>
            <td class="val">&#8377; <?php echo e(number_format((float) $doc->taxable_amount, 0)); ?></td>
          </tr>
          <?php if($showTax): ?>
            <?php if($showSplitTax): ?>
            <tr>
              <td class="lab">GST<?php echo e(($cgstRate !== null && $sgstRate !== null) ? ' ('. $fmtRate($cgstRate + $sgstRate).'%)' : ''); ?></td>
              <td class="val">&#8377; <?php echo e(number_format((float) $doc->cgst_amount + (float) $doc->sgst_amount, 0)); ?></td>
            </tr>
            <?php else: ?>
            <tr>
              <td class="lab">IGST<?php echo e($igstRate ? ' ('.$fmtRate($igstRate).'%)' : ''); ?></td>
              <td class="val">&#8377; <?php echo e(number_format((float) $doc->igst_amount, 0)); ?></td>
            </tr>
            <?php endif; ?>
          <?php endif; ?>
          <?php if($doc->tax_deduction_type === 'tds' || $doc->tax_deduction_type === 'tcs'): ?>
            <?php if($doc->tax_deduction_type === 'tds'): ?>
            <tr class="tds-row">
              <td class="lab">Less: TDS<?php echo e($doc->tds_tcs_rate ? ' ('.$fmtRate($doc->tds_tcs_rate).'% u/s '.$doc->tdsTcsSection?->code.')' : ''); ?></td>
              <td class="val">&#8377; <?php echo e(number_format((float) $doc->tds_tcs_amount, 0)); ?></td>
            </tr>
            <?php else: ?>
            <tr class="tcs-row">
              <td class="lab">Add: TCS<?php echo e($doc->tds_tcs_rate ? ' ('.$fmtRate($doc->tds_tcs_rate).'% u/s '.$doc->tdsTcsSection?->code.')' : ''); ?></td>
              <td class="val">&#8377; <?php echo e(number_format((float) $doc->tds_tcs_amount, 0)); ?></td>
            </tr>
            <?php endif; ?>
            <tr class="grand-row">
              <td>GRAND TOTAL</td>
              <td class="amt">&#8377; <?php echo e(number_format((float) $grand, 0)); ?></td>
            </tr>
          <?php else: ?>
            <tr>
              <td class="lab">Round Off</td>
              <td class="val"><?php echo $roundOffDisplay; ?></td>
            </tr>
            <tr class="grand-row">
              <td>GRAND TOTAL</td>
              <td class="amt">&#8377; <?php echo e(number_format((float) $grand, 0)); ?></td>
            </tr>
          <?php endif; ?>
        </table>
      </div>

      <div class="seal-sign-wrap">
        <table class="sign-block" align="right">
          <tr>
            <td colspan="2" class="sign-for">For <?php echo e($business); ?></td>
          </tr>
          <tr>
            <?php if($sealPath): ?>
            <td class="seal-cell-plain">
              <img class="seal-img" src="<?php echo e($sealPath); ?>" alt="Company Stamp">
            </td>
            <?php endif; ?>
            <td class="sign-plain">
              <?php if($sigPath): ?><img class="sign-img" src="<?php echo e($sigPath); ?>" alt="signature"><br><?php endif; ?>
              <div class="sign-name"><?php echo e($p->signatory_name ?: $business); ?></div>
              <div class="sign-role">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div class="clear"></div>
</div>

<?php if($isRcm): ?>
<div class="rcm-stamp">Tax is payable on reverse charge basis.</div>
<?php endif; ?>

</div>

</body>
</html>
<?php /**PATH C:\Users\KIIT\Desktop\Nexa_Soln\Project-3\abkhanassociates-full-20260805\backend\resources\views/pdf/invoice.blade.php ENDPATH**/ ?>