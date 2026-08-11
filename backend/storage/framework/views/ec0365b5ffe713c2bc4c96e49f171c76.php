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
<h1><?php echo e($title); ?></h1>
<div class="meta">Period: <?php echo e($from); ?> to <?php echo e($to); ?> · A B KHAN & ASSOCIATES</div>
<table>
<?php $headers = count($rows) ? array_keys((array)$rows[0]) : []; ?>
<thead><tr><?php $__currentLoopData = $headers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $h): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><th><?php echo e($h); ?></th><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></tr></thead>
<tbody>
<?php $__currentLoopData = $rows; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $row): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
<tr><?php $__currentLoopData = $headers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $h): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?><td><?php echo e(is_scalar(($row[$h] ?? (($row->$h) ?? ''))) ? ($row[$h] ?? $row->$h ?? '') : json_encode($row[$h] ?? '')); ?></td><?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?></tr>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</tbody>
</table>
</body>
</html>
<?php /**PATH C:\Users\KIIT\Desktop\Nexa_Soln\Project-3\abkhanassociates-full-20260805\backend\resources\views\pdf\report.blade.php ENDPATH**/ ?>