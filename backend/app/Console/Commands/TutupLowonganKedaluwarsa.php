<?php

namespace App\Console\Commands;

use App\Models\JobVacancy;
use Illuminate\Console\Command;

/**
 * Dijadwalkan harian (lihat routes/console.php) — lowongan BKK yang sudah
 * tayang (status "dibuka") tapi tanggal_tutup-nya sudah lewat, otomatis
 * ditutup tanpa perlu IDUKA/BKK klik tutup manual. Sama seperti
 * tutupIduka()/tutupPaksa() di JobVacancyController, lamaran yang masih
 * "diajukan" ikut otomatis ditolak lewat JobVacancy::tolakSisaLamaran() —
 * makanya diproses satu per satu (bukan bulk update) supaya method itu
 * (dan notifikasi ke tiap alumni) tetap jalan.
 */
class TutupLowonganKedaluwarsa extends Command
{
    protected $signature = 'bkk:tutup-lowongan-kedaluwarsa';
    protected $description = 'Tutup otomatis lowongan BKK yang tanggal_tutup-nya sudah lewat, dan tolak sisa lamaran yang menggantung';

    public function handle(): int
    {
        $lowongan = JobVacancy::where('status', 'dibuka')
            ->whereNotNull('tanggal_tutup')
            ->whereDate('tanggal_tutup', '<', now()->toDateString())
            ->get();

        foreach ($lowongan as $d) {
            $d->update(['status' => 'ditutup']);
            $d->tolakSisaLamaran();
        }

        $this->info("{$lowongan->count()} lowongan yang tanggal tutupnya sudah lewat ditutup otomatis.");

        return self::SUCCESS;
    }
}
