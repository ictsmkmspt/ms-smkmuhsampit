<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/**
 * Backup & impor (timpa total) database — cuma boleh Super Admin. Mendukung
 * MySQL (lewat mysqldump/mysql CLI) dan SQLite (copy file .sqlite langsung),
 * mengikuti driver yang sedang dipakai di .env, supaya tetap jalan baik di
 * server produksi (MySQL) maupun instalasi lokal baru (SQLite, sesuai
 * panduan CARA-MENJALANKAN.md).
 */
class SystemBackupController extends Controller
{
    public function backup()
    {
        return config('database.default') === 'sqlite'
            ? $this->backupSqlite()
            : $this->backupMysql();
    }

    /**
     * Impor (timpa total) database dari file backup yang diupload. Selalu
     * membuat backup pengaman dulu di server SEBELUM menimpa apa pun — kalau
     * ternyata file yang diupload salah, datanya masih bisa dipulihkan lewat
     * server (folder storage/app/pre-restore-backups), meskipun tidak ada
     * tombol "undo" otomatis di sini karena impor sudah pasti berjalan.
     */
    public function restore(Request $request)
    {
        $data = $request->validate([
            'konfirmasi_nama_sekolah' => 'required|string',
            'file' => 'required|file|max:512000',
        ]);

        // Default fallback HARUS sama dengan SchoolProfileController::show()
        // — itu yang ditampilkan ke user buat diketik ulang, jadi kalau
        // fallback di sini beda (mis. string kosong), user yang mengetik
        // persis apa yang ditampilkan akan selalu dianggap "tidak cocok".
        $namaSekolah = trim((string) Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit'));
        if ($namaSekolah === '' || trim($data['konfirmasi_nama_sekolah']) !== $namaSekolah) {
            return response()->json([
                'message' => 'Konfirmasi nama sekolah tidak cocok — impor DIBATALKAN demi keamanan. Ketik ulang nama sekolah persis seperti di halaman ini.',
            ], 422);
        }

        return config('database.default') === 'sqlite'
            ? $this->restoreSqlite($request->file('file'))
            : $this->restoreMysql($request->file('file'));
    }

    private function backupMysql()
    {
        $conn = config('database.connections.mysql');
        $filename = 'backup-mysql-' . now()->format('Ymd_His') . '.sql';
        $tempPath = storage_path('app/' . $filename);

        $process = Process::timeout(300)
            ->env(['MYSQL_PWD' => $conn['password']])
            ->run(['mysqldump', '-h', $conn['host'], '-P', (string) $conn['port'], '-u', $conn['username'], '--no-tablespaces', $conn['database']]);

        if (!$process->successful()) {
            return response()->json(['message' => 'Gagal membuat backup: ' . $process->errorOutput()], 500);
        }

        File::put($tempPath, $process->output());

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    private function backupSqlite()
    {
        $path = config('database.connections.sqlite.database');
        $filename = 'backup-sqlite-' . now()->format('Ymd_His') . '.sqlite';

        return response()->download($path, $filename);
    }

    private function restoreMysql($uploadedFile)
    {
        if (strtolower($uploadedFile->getClientOriginalExtension()) !== 'sql') {
            return response()->json(['message' => 'File harus berformat .sql (hasil backup database MySQL dari sistem ini).'], 422);
        }

        $conn = config('database.connections.mysql');

        $preRestoreDir = storage_path('app/pre-restore-backups');
        File::ensureDirectoryExists($preRestoreDir);
        $safetyPath = $preRestoreDir . '/sebelum-impor-' . now()->format('Ymd_His') . '.sql';

        $dump = Process::timeout(300)
            ->env(['MYSQL_PWD' => $conn['password']])
            ->run(['mysqldump', '-h', $conn['host'], '-P', (string) $conn['port'], '-u', $conn['username'], '--no-tablespaces', $conn['database']]);

        if (!$dump->successful()) {
            return response()->json([
                'message' => 'Gagal membuat backup pengaman sebelum impor — impor DIBATALKAN demi keamanan (tidak ada data yang diubah). ' . $dump->errorOutput(),
            ], 500);
        }
        File::put($safetyPath, $dump->output());

        $restore = Process::timeout(300)
            ->env(['MYSQL_PWD' => $conn['password']])
            ->input(File::get($uploadedFile->getRealPath()))
            ->run(['mysql', '-h', $conn['host'], '-P', (string) $conn['port'], '-u', $conn['username'], $conn['database']]);

        if (!$restore->successful()) {
            return response()->json([
                'message' => 'Impor gagal di tengah proses: ' . $restore->errorOutput()
                    . ' Backup pengaman sebelum impor tersimpan di server (storage/app/pre-restore-backups) — hubungi teknisi untuk memulihkannya kalau data sekarang sudah tidak konsisten.',
            ], 500);
        }

        return response()->json([
            'message' => 'Database berhasil diganti dengan file yang diupload. Backup otomatis sebelum impor tersimpan di server.',
        ]);
    }

    private function restoreSqlite($uploadedFile)
    {
        $header = file_get_contents($uploadedFile->getRealPath(), false, null, 0, 16);
        if (!str_starts_with((string) $header, 'SQLite format 3')) {
            return response()->json(['message' => 'File bukan file database SQLite yang valid.'], 422);
        }

        $dbPath = config('database.connections.sqlite.database');

        $preRestoreDir = storage_path('app/pre-restore-backups');
        File::ensureDirectoryExists($preRestoreDir);
        $safetyPath = $preRestoreDir . '/sebelum-impor-' . now()->format('Ymd_His') . '.sqlite';
        File::copy($dbPath, $safetyPath);

        File::copy($uploadedFile->getRealPath(), $dbPath);

        return response()->json([
            'message' => 'Database berhasil diganti dengan file yang diupload. Backup otomatis sebelum impor tersimpan di server.',
        ]);
    }
}
