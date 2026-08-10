<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kode ruangan diisi manual (bukan digenerate sistem) — dipakai buat
     * penomoran ruang resmi sekolah (mis. kode gedung/lantai/ruang),
     * ditampilkan juga di header Kartu Inventaris Ruangan (KIR).
     */
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->string('kode_ruangan')->nullable()->after('nama');
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('kode_ruangan');
        });
    }
};
