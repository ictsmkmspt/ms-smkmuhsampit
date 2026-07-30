<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Perintah sekali-pakai untuk menyalin seluruh data dari database.sqlite (lama)
 * ke koneksi MySQL yang sudah dikonfigurasi di .env (baru), dipakai saat pindah
 * dari SQLite ke MySQL supaya data siswa/poin/riwayat yang sudah ada tidak hilang.
 *
 * Tabel sesi/cache/job/token sengaja TIDAK disalin karena sifatnya sementara
 * (akan terbentuk otomatis lagi) — hanya tabel data bisnis yang disalin.
 */
class MigrateSqliteToMysql extends Command
{
    protected $signature = 'app:migrate-sqlite-to-mysql';
    protected $description = 'Salin semua data dari database.sqlite ke koneksi mysql yang sudah dikonfigurasi di .env';

    /**
     * Urutan ini SENGAJA disusun dari tabel induk ke tabel anak (mengikuti foreign key),
     * meskipun FOREIGN_KEY_CHECKS dimatikan sementara sebagai pengaman tambahan.
     */
    protected array $tables = [
        'users',
        'teachers',
        'class_rooms',
        'students',
        'attendances',
        'violation_types',
        'violations',
        'achievement_types',
        'achievements',
        'holidays',
        'settings',
        'parent_student',
        'prayer_attendances',
    ];

    public function handle()
    {
        // Paksa koneksi 'sqlite' membaca file database.sqlite yang asli, apa pun isi
        // DB_DATABASE di .env saat ini (supaya tidak bentrok dengan kredensial MySQL).
        config(['database.connections.sqlite.database' => database_path('database.sqlite')]);
        DB::purge('sqlite');

        if (!file_exists(database_path('database.sqlite'))) {
            $this->error('File database/database.sqlite tidak ditemukan. Batal.');
            return 1;
        }

        $mysqlDb = config('database.connections.mysql.database');
        $mysqlHost = config('database.connections.mysql.host');

        $this->warn("Ini akan MENIMPA data di database MySQL \"{$mysqlDb}\" @ {$mysqlHost} dengan data dari database.sqlite.");
        if (!$this->confirm('Lanjutkan?')) {
            $this->info('Dibatalkan.');
            return 0;
        }

        // Pastikan koneksi ke MySQL benar-benar hidup sebelum mulai.
        try {
            DB::connection('mysql')->getPdo();
        } catch (\Exception $e) {
            $this->error('Tidak bisa konek ke MySQL: ' . $e->getMessage());
            $this->error('Cek lagi DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD di .env, dan pastikan database-nya sudah dibuat di server.');
            return 1;
        }

        DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ($this->tables as $table) {
            if (!DB::connection('sqlite')->getSchemaBuilder()->hasTable($table)) {
                $this->line("- {$table}: tabel tidak ada di sqlite, dilewati.");
                continue;
            }

            $rows = DB::connection('sqlite')->table($table)->get();

            if ($rows->isEmpty()) {
                $this->line("- {$table}: kosong, dilewati.");
                continue;
            }

            DB::connection('mysql')->table($table)->truncate();

            foreach ($rows->chunk(500) as $chunk) {
                $data = $chunk->map(fn ($row) => (array) $row)->all();
                DB::connection('mysql')->table($table)->insert($data);
            }

            // Samakan AUTO_INCREMENT MySQL supaya data baru nanti lanjut dari ID
            // terakhir, bukan mulai dari 1 lagi dan bentrok.
            if (DB::connection('mysql')->getSchemaBuilder()->hasColumn($table, 'id')) {
                $maxId = DB::connection('mysql')->table($table)->max('id');
                if ($maxId) {
                    DB::connection('mysql')->statement("ALTER TABLE `{$table}` AUTO_INCREMENT = " . ((int) $maxId + 1));
                }
            }

            $this->info("- {$table}: {$rows->count()} baris disalin.");
        }

        DB::connection('mysql')->statement('SET FOREIGN_KEY_CHECKS=1');

        $this->newLine();
        $this->info('Selesai! Semua data berhasil disalin ke MySQL.');
        $this->comment('Catatan: tabel sesi/cache/antrian/token login sengaja tidak disalin (akan terbentuk otomatis). Semua orang perlu login ulang setelah pindah.');

        return 0;
    }
}
