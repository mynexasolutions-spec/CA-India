<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
@php
  // Wide reports (HSN/SAC Summary and similar with many columns) need landscape or
  // the table overruns the page — narrower reports (GST Summary, GST Liability) stay portrait.
  $headers = count($rows) ? array_keys((array) $rows[0]) : [];
  $orientation = count($headers) > 6 ? 'landscape' : 'portrait';
@endphp
<style>
@page { margin: 10mm 10mm 12mm 10mm; size: A4 {{ $orientation }}; }
* { box-sizing: border-box; }
body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 0; line-height: 1.32; }
table { width: 100%; border-collapse: collapse; }

/* ===== Company header — same visual language as the invoice PDF ===== */
.company-box { border: 1.2px dashed #93c5fd; border-radius: 11px; padding: 12px 16px; margin-bottom: 6px; text-align: center; background: #f8fafc; }
.company-name { font-size: 17px; font-weight: bold; color: #1e40af; margin: 0 0 5px; letter-spacing: 0.3px; }
.company-address { font-size: 9.5px; color: #475569; margin: 0 0 6px; }
.company-meta { font-size: 9.5px; color: #334155; }
.company-meta b { color: #1e293b; }
.company-meta .sep { color: #94a3b8; margin: 0 8px; }

.header-arrow { text-align: center; color: #2563eb; font-size: 16px; line-height: 1; margin: 2px 0 10px; }

/* ===== Report title box ===== */
.report-title-wrap { text-align: center; margin-bottom: 14px; border: 1.2px solid #bfdbfe; background: #eff6ff; border-radius: 10px; padding: 10px 16px; }
.report-title { font-size: 18px; font-weight: bold; color: #1e40af; letter-spacing: 0.6px; text-transform: uppercase; margin: 0 0 4px; }
.report-period { font-size: 10.5px; color: #64748b; margin: 0; }

/* ===== Table ===== */
.report-table { border: 1px solid #bcd0ee; border-radius: 8px; overflow: hidden; }
.report-table th { background: #1e40af; color: #ffffff; font-size: 10px; font-weight: bold; padding: 8px 10px; text-align: center; white-space: nowrap; }
.report-table th:first-child { text-align: left; }
.report-table td { border-bottom: 1px solid #e2e8f0; padding: 7px 10px; font-size: 10.5px; text-align: center; color: #1e293b; }
.report-table td:first-child { text-align: left; font-weight: bold; color: #0f172a; }
.report-table tr:nth-child(even) td { background: #f8fafc; }
.report-table tr.total-row td { background: #dbeafe; border-top: 2px solid #1e40af; border-bottom: 0; color: #1e40af; font-weight: bold; font-size: 11px; }

.empty-note { text-align: center; color: #64748b; font-size: 10.5px; padding: 16px 0; }
</style>
</head>
<body>

@php
  $business = $meta['name'] ?? null;
  $address = $meta['address'] ?? '';
  $phone = $meta['phone'] ?? null;
  $email = $meta['email'] ?? null;
  $gstin = $meta['gstin'] ?? null;

  // Which columns hold money — computed once by the controller (computeMoneyHeaders())
  // and shared with the Excel export, so the two formats never disagree.
  $isMoneyCol = fn ($h) => in_array($h, $moneyHeaders, true);
  // Only the report's actual final summary row gets the bold highlight (e.g. "Total
  // Gross Value") — not every row whose label merely starts with "Total" (a report
  // like GST Liability has several: "Total Output GST", "Total Eligible ITC", etc.,
  // none of which are THE grand total for that table).
  $isTotalRow = function ($row, $index) use ($rows) {
    if ($index !== count($rows) - 1) {
      return false;
    }
    $first = is_array($row) ? reset($row) : $row;

    return is_string($first) && stripos($first, 'total') !== false;
  };
@endphp

@if($business)
<div class="company-box">
  <div class="company-name">{{ strtoupper($business) }}</div>
  @if($address)
  <div class="company-address">{{ $address }}</div>
  @endif
  @if($gstin || $phone || $email)
  <div class="company-meta">
    @if($gstin)<b>GSTIN:</b> {{ $gstin }}@endif
    @if($gstin && ($phone || $email))<span class="sep">|</span>@endif
    @if($phone)<b>Contact:</b> {{ $phone }}@endif
    @if($phone && $email)<span class="sep">|</span>@endif
    @if($email)<b>Email:</b> {{ $email }}@endif
  </div>
  @endif
</div>
<div class="header-arrow">&#8595;</div>
@endif

<div class="report-title-wrap">
  <div class="report-title">{{ $title }}</div>
  <p class="report-period">Report Period: {{ $periodText }}</p>
</div>

@if(!count($rows))
<div class="report-table" style="border-radius:8px;"><div class="empty-note">No data for this period.</div></div>
@else
<table class="report-table">
<thead><tr>@foreach($headers as $h)<th>{{ $h }}@if($isMoneyCol($h)) (₹)@endif</th>@endforeach</tr></thead>
<tbody>
@foreach($rows as $i => $row)
@php $arr = (array) $row; @endphp
<tr @if($isTotalRow($arr, $i)) class="total-row" @endif>
@foreach($headers as $h)
@php $v = $arr[$h] ?? ''; @endphp
<td>{{ $isMoneyCol($h) && is_numeric($v) ? number_format((float) $v, 2) : (is_scalar($v) ? $v : json_encode($v)) }}</td>
@endforeach
</tr>
@endforeach
</tbody>
</table>
@endif

</body>
</html>
