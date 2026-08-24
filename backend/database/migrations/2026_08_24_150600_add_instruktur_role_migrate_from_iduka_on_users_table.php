<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pisahkan akun pembimbing PKL lapangan dari identitas perusahaan mitra
     * (IDUKA) — akun yang SEKARANG dipakai untuk absensi/jurnal/penilaian PKL
     * dipindah ke role baru 'instruktur', supaya role 'iduka' bisa dipakai
     * lagi nanti khusus untuk fitur BKK (pasang lowongan) tanpa bentrok
     * kewenangan dengan pembimbing PKL. 'iduka' TETAP ada di enum (bukan
     * dihapus seperti migrasi rename dudi->iduka sebelumnya) karena
     * maknanya cuma bergeser, bukan pensiun.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'iduka', 'instruktur', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
                'pengawas_ujian',
            ])->default('siswa')->change();
        });

        DB::table('users')->where('role', 'iduka')->update(['role' => 'instruktur']);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'instruktur')->update(['role' => 'iduka']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'iduka', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
                'teknisi', 'kepala_bengkel', 'bk', 'pustakawan', 'kepala_sekolah',
                'pengawas_ujian',
            ])->default('siswa')->change();
        });
    }
};
