<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BK (Bimbingan Konseling / konselor sekolah) — akun login baru
     * terpisah, menindaklanjuti siswa yang masuk tahap Sanksi Bertingkat
     * (lihat migrasi create_sanksi_kejadian_table).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk',
            ])->default('siswa')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel',
            ])->default('siswa')->change();
        });
    }
};
