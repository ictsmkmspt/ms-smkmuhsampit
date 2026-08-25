<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tandai lowongan yang dipasang LANGSUNG oleh BKK (JobVacancyController::
 * storeBkk(), lihat App Service catatan di sana) vs yang dipasang mandiri
 * oleh IDUKA sendiri (storeIduka()) — dipakai frontend publik/siswa untuk
 * ganti tombol "Masuk untuk Melamar" jadi "Hubungi Perusahaan" khusus
 * lowongan sumber "bkk", karena BKK yang pasang biasanya berarti
 * perusahaannya belum/tidak pakai akun IDUKA sendiri untuk kelola
 * lamaran masuk lewat sistem.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE job_vacancies ADD COLUMN sumber ENUM('iduka','bkk') NOT NULL DEFAULT 'iduka' AFTER iduka_id");
        } else {
            Schema::table('job_vacancies', function (Blueprint $table) {
                $table->string('sumber')->default('iduka')->after('iduka_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropColumn('sumber');
        });
    }
};
