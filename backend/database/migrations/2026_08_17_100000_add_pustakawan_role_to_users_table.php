<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pengurus Perpustakaan — akun login baru terpisah, mengelola katalog
     * buku & sirkulasi pinjam/kembali. Tidak terikat ruang (beda dari
     * teknisi/kepala_bengkel), jadi tidak butuh kolom tambahan di users.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan',
            ])->default('siswa')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk',
            ])->default('siswa')->change();
        });
    }
};
