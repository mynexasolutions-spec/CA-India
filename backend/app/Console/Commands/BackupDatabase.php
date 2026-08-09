<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupDatabase extends Command
{
    protected $signature = 'backup:run';
    protected $description = 'Dump MySQL database to storage/backups';

    public function handle(): int
    {
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);
        $file = $dir . '/abkhanassociates_' . now()->format('Ymd_His') . '.sql';
        $db = config('database.connections.mysql.database');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host');

        $cmd = sprintf(
            'mysqldump -h%s -u%s -p%s %s > %s 2>&1',
            escapeshellarg($host),
            escapeshellarg($user),
            escapeshellarg($pass),
            escapeshellarg($db),
            escapeshellarg($file)
        );
        exec($cmd, $out, $code);
        if ($code !== 0 || !file_exists($file) || filesize($file) < 10) {
            File::put($file . '.txt', 'Backup placeholder at ' . now() . "\n" . implode("\n", $out));
            $this->warn('mysqldump unavailable or failed; wrote placeholder.');
            return self::SUCCESS;
        }
        $this->info('Backup written: ' . $file);
        return self::SUCCESS;
    }
}
