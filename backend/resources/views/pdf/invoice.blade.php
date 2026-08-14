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
@php
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
@endphp

<div class="frame">

{{-- HEADER --}}
<table>
  <tr>
    <td style="width:60%;">
      <table>
        <tr>
          @if($logoPath)
          <td class="logo-cell">
            <img class="logo-img" src="{{ $logoPath }}" alt="logo">
          </td>
          @endif
          <td>
            <div class="company-name">{{ strtoupper($business) }}</div>

            <table class="meta-row"><tr>
              <td class="meta-icon-cell">@if($pinIcon)<img src="{{ $pinIcon }}" alt="">@endif</td>
              <td class="meta-text">{{ implode(', ', $addressParts) ?: '—' }}</td>
            </tr></table>

            @if(($p->has_gst && $p->gstin) || $p->pan)
            <table class="meta-row"><tr>
              <td class="meta-icon-cell">@if($gstinIcon)<img src="{{ $gstinIcon }}" alt="">@endif</td>
              <td class="meta-text">
                @if($p->has_gst && $p->gstin)<b>GSTIN :</b> {{ $p->gstin }}@endif
                @if($p->pan){{ ($p->has_gst && $p->gstin) ? '  |  ' : '' }}<b>PAN :</b> {{ $p->pan }}@endif
              </td>
            </tr></table>
            @endif

            @if($email)
            <table class="meta-row"><tr>
              <td class="meta-icon-cell">@if($emailIcon)<img src="{{ $emailIcon }}" alt="">@endif</td>
              <td class="meta-text"><b>Email :</b> {{ $email }}</td>
            </tr></table>
            @endif

            @if($phone)
            <table class="meta-row"><tr>
              <td class="meta-icon-cell">@if($phoneIcon)<img src="{{ $phoneIcon }}" alt="">@endif</td>
              <td class="meta-text"><b>Phone :</b> {{ $phone }}</td>
            </tr></table>
            @endif

            @if($p->state || $p->state_code)
            <table class="meta-row"><tr>
              <td class="meta-icon-cell">@if($pinIcon)<img src="{{ $pinIcon }}" alt="">@endif</td>
              <td class="meta-text"><b>State :</b> {{ $stateLine($p->state, $p->state_code) }}</td>
            </tr></table>
            @endif
          </td>
        </tr>
      </table>
    </td>
    <td class="col-spacer"></td>
    <td style="width:37%;" class="right">
      <div class="doc-title">{{ $docTitle }}</div>
      <table class="inv-meta">
        <tr>
          <td class="lab">{{ $metaLabel }} No.</td>
          <td class="colon">:</td>
          <td class="val">{{ $doc->number }}</td>
        </tr>
        <tr>
          <td class="lab">{{ $metaLabel }} Date</td>
          <td class="colon">:</td>
          <td class="val-plain">{{ $doc->document_date?->format('d-m-Y') }}</td>
        </tr>
        <tr>
          <td class="lab">Place of Supply</td>
          <td class="colon">:</td>
          <td class="val-plain">{{ $posLine }}</td>
        </tr>
        <tr>
          <td class="lab">Reverse Charge</td>
          <td class="colon">:</td>
          <td class="val-plain">{{ $isRcm ? 'Yes' : 'No' }}</td>
        </tr>
        @if($doc->referenceDocument)
        <tr>
          <td class="lab">Against</td>
          <td class="colon">:</td>
          <td class="val">{{ $doc->referenceDocument->number }}</td>
        </tr>
        @endif
      </table>
    </td>
  </tr>
</table>

<hr class="hdr-rule">

{{-- BILL TO / SHIP TO with navy header bars --}}
<table class="party-wrap">
  <tr>
    <td class="party-cell">
      <div class="party-box">
      <div class="party-head">Details of Receiver | Bill To</div>
      <div class="party-body">
        @if($c)
          <div class="party-name">{{ $customerLabel ?: '—' }}</div>
          <table class="party-fields">
            <tr><td class="pf-lab">Name</td><td class="pf-colon">:</td><td class="pf-val">{{ $c->name ?: '—' }}</td></tr>
            @if($billAddr)<tr><td class="pf-lab">Address</td><td class="pf-colon">:</td><td class="pf-val">{{ $billAddr }}</td></tr>@endif
            <tr><td class="pf-lab">GSTIN</td><td class="pf-colon">:</td><td class="pf-val">{{ $c->gstin_display }}</td></tr>
            @if($billStateLine)<tr><td class="pf-lab">State</td><td class="pf-colon">:</td><td class="pf-val">{{ $billStateLine }}</td></tr>@endif
            @if($c->phone)<tr><td class="pf-lab">Mobile</td><td class="pf-colon">:</td><td class="pf-val">{{ $c->phone }}</td></tr>@endif
          </table>
        @else
          <div class="party-line">—</div>
        @endif
      </div>
      </div>
    </td>
    <td class="col-spacer"></td>
    <td class="party-cell">
      <div class="party-box">
      <div class="party-head">Details of Consignee | Ship To</div>
      <div class="party-body">
        @if($c)
          <div class="party-name">{{ $customerLabel ?: '—' }}</div>
          <table class="party-fields">
            <tr><td class="pf-lab">Name</td><td class="pf-colon">:</td><td class="pf-val">{{ $c->name ?: '—' }}</td></tr>
            @if($shipAddr)<tr><td class="pf-lab">Address</td><td class="pf-colon">:</td><td class="pf-val">{{ $shipAddr }}</td></tr>@endif
            <tr><td class="pf-lab">GSTIN</td><td class="pf-colon">:</td><td class="pf-val">{{ $c->gstin_display }}</td></tr>
            @if($shipStateLine)<tr><td class="pf-lab">State</td><td class="pf-colon">:</td><td class="pf-val">{{ $shipStateLine }}</td></tr>@endif
            @if($c->phone)<tr><td class="pf-lab">Mobile</td><td class="pf-colon">:</td><td class="pf-val">{{ $c->phone }}</td></tr>@endif
          </table>
        @else
          <div class="party-line">—</div>
        @endif
      </div>
      </div>
    </td>
  </tr>
</table>

{{-- LINE ITEMS --}}
<div class="items-wrap">
<table class="items">
  <thead>
    <tr>
      <th style="width:{{ $colSno }}%;">S.No.</th>
      <th style="width:{{ $colDesc }}%;">Product / Service<br>Dis.</th>
      @if($colHsn)
      <th style="width:{{ $colHsn }}%;">HSN /<br>SAC</th>
      @endif
      <th style="width:{{ $colQty }}%;">Qty</th>
      <th style="width:{{ $colRate }}%;">Rate<br>(&#8377;)</th>
      <th style="width:{{ $colDisc }}%;">Disc<br>(&#8377;)</th>
      <th style="width:{{ $colTaxable }}%;">Taxable Value<br>(&#8377;)</th>
      @if($showTax)
        @if($showSplitTax)
      <th style="width:{{ $colTax / 2 }}%;">CGST<br>(&#8377;)</th>
      <th style="width:{{ $colTax / 2 }}%;">SGST<br>(&#8377;)</th>
        @else
      <th style="width:{{ $colTax }}%;">IGST<br>(&#8377;)</th>
        @endif
      @endif
      <th style="width:{{ $colTotal }}%;">Total<br>(&#8377;)</th>
    </tr>
  </thead>
  <tbody>
    @forelse($doc->lineItems as $i => $item)
      @php [$title, $sub] = $splitDesc($item->description); @endphp
      <tr>
        <td class="center"><strong>{{ $i + 1 }}</strong></td>
        <td>
          <div class="item-title">{{ $title }}</div>
          @if($sub)<div class="item-sub">{{ $sub }}</div>@endif
        </td>
        @if($colHsn)
        <td class="center"><strong>{{ $item->hsn_sac ?: '—' }}</strong></td>
        @endif
        <td class="center">
          <span class="qty-num">{{ number_format((float) $item->qty, 0) }}</span>
          <div style="font-size:8.5px;color:#64748b;">{{ strtoupper($item->unit ?: 'NOS') }}</div>
        </td>
        <td class="amt">{{ number_format((float) $item->rate, 0) }}</td>
        <td class="amt">{{ number_format((float) $item->discount_amount, 0) }}</td>
        <td class="amt">{{ number_format((float) $item->taxable_amount, 0) }}</td>
        @if($showTax)
          @if($showSplitTax)
        <td class="amt">{{ number_format((float) $item->cgst_amount, 0) }}</td>
        <td class="amt">{{ number_format((float) $item->sgst_amount, 0) }}</td>
          @else
        <td class="amt">{{ number_format((float) $item->igst_amount, 0) }}</td>
          @endif
        @endif
        <td class="amt">{{ number_format((float) $item->total_amount, 0) }}</td>
      </tr>
    @empty
      <tr><td colspan="{{ $totalCols }}" class="center" style="color:#94a3b8;">No line items</td></tr>
    @endforelse
  </tbody>
</table>
</div>

{{-- LEFT: Amount in Words / Bank Details / Terms (stacked cards) | RIGHT: Totals + Seal/Signature --}}
<div class="summary-flow">
    <div class="sum-left">
      <div class="card">
        <div class="card-head">
          @if($rupeeIcon)<img src="{{ $rupeeIcon }}" alt="Rs">@endif
          Amount in Words
        </div>
        <div class="card-sep"></div>
        <span class="words-value">{{ $wordsDisplay }}</span>
      </div>

      <div class="card card-gap">
        @if($hasBank)
          <div class="card-head">
            @if($bankIcon)<img src="{{ $bankIcon }}" alt="">@endif
            Bank Details (For RTGS/NEFT Transfers)
          </div>
          <div class="card-sep"></div>
          <div class="bank-line"><b>Bank Name :</b> <span class="bank-name">{{ $p->bank_name ?: '—' }}</span></div>
          <div class="bank-line">
            @if($p->account_holder_name)Account Name : {{ $p->account_holder_name }}<br>@endif
            Account Number : {{ $p->bank_account ?: '—' }}@if($p->bank_ifsc) &nbsp;|&nbsp; IFSC Code : {{ $p->bank_ifsc }}@endif
            @if($p->bank_branch)<br>Branch : {{ $p->bank_branch }}@endif
            @if($p->upi_id)<br>UPI ID : {{ $p->upi_id }}@endif
          </div>
        @endif
      </div>

      <div class="card card-gap">
        <div class="card-head">
          @if($termsIcon)<img src="{{ $termsIcon }}" alt="">@endif
          Terms and Conditions
        </div>
        <div class="card-sep"></div>
        <ol class="terms-list">
          @foreach($termsLines as $t)
            <li>{{ $t }}</li>
          @endforeach
        </ol>
      </div>
    </div>
    <div class="sum-right">
      <div class="totals-cell">
        <table class="totals">
          <tr>
            <td class="lab">Total Taxable Value</td>
            <td class="val">&#8377; {{ number_format((float) $doc->taxable_amount, 0) }}</td>
          </tr>
          @if($showTax)
            @if($showSplitTax)
            <tr>
              <td class="lab">GST{{ ($cgstRate !== null && $sgstRate !== null) ? ' ('. $fmtRate($cgstRate + $sgstRate).'%)' : '' }}</td>
              <td class="val">&#8377; {{ number_format((float) $doc->cgst_amount + (float) $doc->sgst_amount, 0) }}</td>
            </tr>
            @else
            <tr>
              <td class="lab">IGST{{ $igstRate ? ' ('.$fmtRate($igstRate).'%)' : '' }}</td>
              <td class="val">&#8377; {{ number_format((float) $doc->igst_amount, 0) }}</td>
            </tr>
            @endif
          @endif
          @if($doc->tax_deduction_type === 'tds' || $doc->tax_deduction_type === 'tcs')
            @if($doc->tax_deduction_type === 'tds')
            <tr class="tds-row">
              <td class="lab">Less: TDS{{ $doc->tds_tcs_rate ? ' ('.$fmtRate($doc->tds_tcs_rate).'% u/s '.$doc->tdsTcsSection?->code.')' : '' }}</td>
              <td class="val">&#8377; {{ number_format((float) $doc->tds_tcs_amount, 0) }}</td>
            </tr>
            @else
            <tr class="tcs-row">
              <td class="lab">Add: TCS{{ $doc->tds_tcs_rate ? ' ('.$fmtRate($doc->tds_tcs_rate).'% u/s '.$doc->tdsTcsSection?->code.')' : '' }}</td>
              <td class="val">&#8377; {{ number_format((float) $doc->tds_tcs_amount, 0) }}</td>
            </tr>
            @endif
            <tr class="grand-row">
              <td>GRAND TOTAL</td>
              <td class="amt">&#8377; {{ number_format((float) $grand, 0) }}</td>
            </tr>
          @else
            <tr>
              <td class="lab">Round Off</td>
              <td class="val">{!! $roundOffDisplay !!}</td>
            </tr>
            <tr class="grand-row">
              <td>GRAND TOTAL</td>
              <td class="amt">&#8377; {{ number_format((float) $grand, 0) }}</td>
            </tr>
          @endif
        </table>
      </div>

      <div class="seal-sign-wrap">
        <table class="sign-block" align="right">
          <tr>
            <td colspan="2" class="sign-for">For {{ $business }}</td>
          </tr>
          <tr>
            @if($sealPath)
            <td class="seal-cell-plain">
              <img class="seal-img" src="{{ $sealPath }}" alt="Company Stamp">
            </td>
            @endif
            <td class="sign-plain">
              @if($sigPath)<img class="sign-img" src="{{ $sigPath }}" alt="signature"><br>@endif
              <div class="sign-name">{{ $p->signatory_name ?: $business }}</div>
              <div class="sign-role">Authorised Signatory</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div class="clear"></div>
</div>

@if($isRcm)
<div class="rcm-stamp">Tax is payable on reverse charge basis.</div>
@endif

</div>

</body>
</html>
