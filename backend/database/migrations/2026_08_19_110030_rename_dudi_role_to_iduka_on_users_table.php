<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti nilai role 'dudi' jadi 'iduka' di data yang SUDAH ADA — dilakukan
     * 3 langkah supaya aman: (1) tambah 'iduka' ke enum TANPA hapus 'dudi'
     * dulu (supaya baris lama tetap valid selama proses), (2) pindahkan
     * semua baris role='dudi' jadi 'iduka', (3) baru hapus 'dudi' dari enum.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'iduka', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
            ])->default('siswa')->change();
        });

        DB::table('users')->where('role', 'dudi')->update(['role' => 'iduka']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'iduka', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
            ])->default('siswa')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'iduka', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
            ])->default('siswa')->change();
        });

        DB::table('users')->where('role', 'iduka')->update(['role' => 'dudi']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
            ])->default('siswa')->change();
        });
    }
};
