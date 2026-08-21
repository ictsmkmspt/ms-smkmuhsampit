<?php

namespace App\Console\Commands;

use App\Models\CbtExam;
use Illuminate\Console\Command;

/**
 * Dijadwalkan tiap 5 menit (lihat routes/console.php) — ujian (tipe
 * "ujian", BUKAN latihan) tidak lagi punya tombol "Terbitkan"/"Tutup"
 * manual karena sudah punya jadwal_mulai/jadwal_selesai sendiri: begitu
 * dibuat langsung berstatus "terbuka", dan begitu jadwal_selesai lewat,
 * command ini yang menutupnya jadi "selesai" (supaya guru bisa koreksi
 * essay & publikasikan nilai tanpa perlu klik tombol tutup manual lagi).
 * Latihan tidak disentuh sama sekali — masih pakai Terbitkan/Tutup manual
 * karena tidak punya jadwal.
 */
class TutupUjianTerjadwal extends Command
{
    protected $signature = 'cbt:tutup-ujian-terjadwal';
    protected $description = 'Tutup otomatis ujian (tipe ujian) yang jadwal_selesai-nya sudah lewat';

    public function handle(): int
    {
        $jumlah = CbtExam::where('tipe', 'ujian')
            ->where('status', 'terbuka')
            ->whereNotNull('jadwal_selesai')
            ->where('jadwal_selesai', '<', now())
            ->update(['status' => 'selesai']);

        $this->info("{$jumlah} ujian yang jadwalnya sudah lewat ditutup otomatis.");

        return self::SUCCESS;
    }
}
