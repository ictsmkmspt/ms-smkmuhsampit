<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kepala Sekolah — akun login baru, READ-ONLY (tidak bisa tambah/ubah/
     * hapus apa pun), cuma untuk lihat dashboard ringkasan lintas modul
     * (kesiswaan, PKL, perpustakaan, keuangan, kepegawaian, PPDB).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
            ])->default('siswa')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan',
            ])->default('siswa')->change();
        });
    }
};
