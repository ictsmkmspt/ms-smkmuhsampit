<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lowongan yang dipasang BKK LANGSUNG (JobVacancyController::storeBkk())
 * TIDAK LAGI dihubungkan ke baris IDUKA yang sudah terdaftar — BKK isi
 * manual nama/email/telepon/alamat perusahaan (perusahaan itu belum
 * tentu punya akun IDUKA di sistem, mis. baru telepon sekali tanpa
 * berlangganan jadi mitra tetap). `iduka_id` jadi nullable: lowongan
 * dari IDUKA sendiri (storeIduka()) tetap terhubung seperti biasa,
 * cuma lowongan BKK yang null. Dipakai ALTER TABLE mentah (bukan
 * Blueprint::change()) karena doctrine/dbal tidak terpasang.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE job_vacancies MODIFY iduka_id BIGINT UNSIGNED NULL');
        }

        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->string('nama_perusahaan_manual')->nullable()->after('iduka_id');
            $table->string('email_manual')->nullable()->after('nama_perusahaan_manual');
            $table->string('telepon_manual')->nullable()->after('email_manual');
            $table->string('alamat_manual')->nullable()->after('telepon_manual');
        });
    }

    public function down(): void
    {
        Schema::table('job_vacancies', function (Blueprint $table) {
            $table->dropColumn(['nama_perusahaan_manual', 'email_manual', 'telepon_manual', 'alamat_manual']);
        });
    }
};
