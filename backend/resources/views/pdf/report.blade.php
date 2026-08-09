<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:DejaVu Sans,sans-serif;font-size:11px;color:#0f2d44}
h1{font-size:16px;color:#175888;margin:0 0 8px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{border:1px solid #ccd6e0;padding:5px;text-align:left}
th{background:#e8f1f8}
.meta{color:#5b6b82;margin-bottom:8px}
</style>
</head>
<body>
<h1>{{ $title }}</h1>
<div class="meta">Period: {{ $from }} to {{ $to }} · A B KHAN & ASSOCIATES</div>
<table>
@php $headers = count($rows) ? array_keys((array)$rows[0]) : []; @endphp
<thead><tr>@foreach($headers as $h)<th>{{ $h }}</th>@endforeach</tr></thead>
<tbody>
@foreach($rows as $row)
<tr>@foreach($headers as $h)<td>{{ is_scalar(($row[$h] ?? (($row->$h) ?? ''))) ? ($row[$h] ?? $row->$h ?? '') : json_encode($row[$h] ?? '') }}</td>@endforeach</tr>
@endforeach
</tbody>
</table>
</body>
</html>
