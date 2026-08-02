<?php

namespace App\Console\Commands;

use App\Models\Spp;
use Illuminate\Console\Command;

/**
 * Dijadwalkan otomatis jalan tiap tanggal 1 (lihat routes/console.php) supaya
 * tagihan SPP bulan berjalan langsung terbuat tanpa TU harus login & klik
 * "Buat Tagihan Bulan Ini" secara manual. Nominal dipakai dari nominal
 * default yang diatur TU di menu Pengaturan SPP.
 */
class GenerateSppBulanan extends Command
{
    protected $signature = 'spp:generate-bulanan';
    protected $description = 'Buat tagihan SPP bulan berjalan untuk semua siswa yang belum punya tagihan bulan ini';

    public function handle(): int
    {
        $bulan = (int) now()->format('n');
        $tahun = (int) now()->format('Y');

        $dibuat = Spp::generateBulanan($bulan, $tahun);

        $this->info("Tagihan SPP {$bulan}/{$tahun} dibuat untuk {$dibuat} siswa.");

        return self::SUCCESS;
    }
}
