<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Role generik "waka" dipecah jadi 4 peran sesuai bidang Waka yang
     * sebenarnya. Nilai "waka" lama TETAP dipertahankan di enum (data lama
     * tidak pernah dipaksa berubah oleh migration schema), tapi akun yang
     * masih pakai nilai itu dipindahkan manual ke "waka_kesiswaan" segera
     * setelah migration ini jalan.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', [
                'admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka',
                'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
            ])->default('siswa')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'guru', 'siswa', 'wali', 'dudi', 'tu', 'waka'])->default('siswa')->change();
        });
    }
};
