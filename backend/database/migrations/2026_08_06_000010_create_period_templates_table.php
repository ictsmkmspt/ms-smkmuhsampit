<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Template baris jam/slot yang dipakai tombol "Muat Template Default"
     * di menu Jadwal Pelajaran — dulu hardcode di kode (PeriodController::
     * templateDefault()), sekarang dipindah ke tabel supaya Waka Kurikulum
     * bisa mengubahnya sendiri lewat menu Template Jadwal, tanpa perlu ganti
     * kode. Global (tidak terikat tahun_ajaran_id) — 1 template dipakai
     * untuk tahun ajaran manapun saat "Muat Template Default" ditekan.
     */
    public function up(): void
    {
        Schema::create('period_templates', function (Blueprint $table) {
            $table->id();
            $table->enum('hari', ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']);
            $table->string('jam_ke', 10)->nullable();
            $table->time('waktu_mulai');
            $table->time('waktu_selesai');
            $table->enum('tipe', ['pelajaran', 'khusus']);
            $table->string('label_khusus', 150)->nullable();
            $table->string('warna', 7)->nullable();
            $table->timestamps();
        });

        // Isi awal = persis template lama yang sebelumnya hardcode di kode,
        // supaya tombol "Muat Template Default" tetap berperilaku sama
        // persis sebelum siapa pun sempat mengubahnya.
        $senin = [
            ['', '06:50', '07:20', 'khusus', 'UPACARA BENDERA', null],
            ['1', '07:20', '07:50', 'pelajaran', null, null],
            ['2', '07:50', '08:20', 'pelajaran', null, null],
            ['3', '08:20', '08:50', 'pelajaran', null, null],
            ['4', '08:50', '09:20', 'pelajaran', null, null],
            ['', '09:20', '09:40', 'khusus', 'ISTIRAHAT PERTAMA', null],
            ['5', '09:40', '10:10', 'pelajaran', null, null],
            ['6', '10:10', '10:40', 'pelajaran', null, null],
            ['7', '10:40', '11:10', 'pelajaran', null, null],
            ['', '11:10', '11:50', 'khusus', 'SHOLAT DZUHUR BERJAMAAH', null],
            ['', '11:50', '12:20', 'khusus', 'ISTIRAHAT KEDUA', null],
            ['8', '12:20', '13:00', 'khusus', "KOKURIKULER - LITERASI AL-QUR'AN", '#D4EACB'],
            ['9', '13:00', '13:30', 'pelajaran', null, null],
            ['10', '13:30', '14:00', 'pelajaran', null, null],
            ['11', '14:00', '14:30', 'pelajaran', null, null],
            ['12', '14:30', '15:00', 'pelajaran', null, null],
            ['', '15:00', '15:05', 'khusus', 'PULANG', null],
        ];

        $selasaRabuKamis = $senin;
        $selasaRabuKamis[0] = ['0', '06:50', '07:20', 'khusus', 'SHOLAT DUHA', null];

        $jumat = [
            ['', '06:50', '07:20', 'khusus', 'SENAM PAGI', null],
            ['1-3', '07:20', '08:50', 'khusus', 'EKSKUL WAJIB TERJADWAL (KEMUHAMMADIYAHAN, HW DAN TS)', '#D4EACB'],
            ['', '08:50', '09:10', 'khusus', 'ISTIRAHAT', null],
            ['4-6', '09:10', '10:30', 'khusus', 'PENGEMBANGAN DIRI: EKSKUL PILIHAN', '#D4EACB'],
            ['', '10:30', '10:35', 'khusus', 'PULANG', null],
        ];

        $template = [
            'senin' => $senin,
            'selasa' => $selasaRabuKamis,
            'rabu' => $selasaRabuKamis,
            'kamis' => $selasaRabuKamis,
            'jumat' => $jumat,
        ];

        $rows = [];
        $now = now();
        foreach ($template as $hari => $baris) {
            foreach ($baris as [$jamKe, $mulai, $selesai, $tipe, $label, $warna]) {
                $rows[] = [
                    'hari' => $hari,
                    'jam_ke' => $jamKe !== '' ? $jamKe : null,
                    'waktu_mulai' => $mulai,
                    'waktu_selesai' => $selesai,
                    'tipe' => $tipe,
                    'label_khusus' => $label,
                    'warna' => $warna,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        DB::table('period_templates')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('period_templates');
    }
};
