<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * NISN (Nomor Induk Siswa Nasional) — beda dari NIS (nomor induk lokal
     * sekolah, sudah ada). Nullable karena tidak semua siswa lama sudah
     * punya datanya diinput; unique kalau diisi (MySQL memperbolehkan
     * banyak baris NULL berbarengan meski kolomnya unique).
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('nisn', 20)->nullable()->unique()->after('nis');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('nisn');
        });
    }
};
