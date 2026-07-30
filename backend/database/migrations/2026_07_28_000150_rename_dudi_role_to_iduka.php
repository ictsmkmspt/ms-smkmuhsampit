<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti nilai role akun DUDI jadi "iduka". Dilakukan 3 langkah supaya aman
     * di MySQL (kolom role adalah ENUM): (1) tambah "iduka" ke pilihan enum
     * sambil "dudi" masih ada, (2) pindahkan semua data akun yang rolenya
     * "dudi" jadi "iduka", (3) baru hapus "dudi" dari pilihan enum.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'guru', 'siswa', 'wali', 'dudi', 'iduka'])->default('siswa')->change();
        });

        DB::table('users')->where('role', 'dudi')->update(['role' => 'iduka']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'guru', 'siswa', 'wali', 'iduka'])->default('siswa')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'guru', 'siswa', 'wali', 'dudi', 'iduka'])->default('siswa')->change();
        });

        DB::table('users')->where('role', 'iduka')->update(['role' => 'dudi']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'guru', 'siswa', 'wali', 'dudi'])->default('siswa')->change();
        });
    }
};
