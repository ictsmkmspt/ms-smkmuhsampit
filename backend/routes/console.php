<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Tagihan SPP bulan berjalan otomatis dibuat tiap tanggal 1 jam 00:10,
// tanpa TU harus login & klik "Buat Tagihan Bulan Ini" secara manual.
Schedule::command('spp:generate-bulanan')->monthlyOn(1, '00:10');

// Foto pengumuman (Papan Pengumuman) dihapus otomatis setelah 30 hari
// supaya storage server tidak terus membengkak — teksnya tetap disimpan.
Schedule::command('announcements:cleanup-photos')->daily();

// Ujian (tipe ujian, bukan latihan) tidak punya tombol Tutup manual lagi
// — begitu jadwal_selesai lewat, ditutup otomatis supaya guru bisa lanjut
// koreksi essay & publikasikan nilai.
Schedule::command('cbt:tutup-ujian-terjadwal')->everyFiveMinutes();
