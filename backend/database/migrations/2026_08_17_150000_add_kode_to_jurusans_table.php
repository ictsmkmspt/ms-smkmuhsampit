<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kode singkat jurusan (mis. "TKJ", "RPL") — nullable di level database
     * supaya baris jurusan yang mungkin sudah dibuat sebelum kolom ini ada
     * tidak error, tapi divalidasi WAJIB diisi untuk jurusan baru lewat
     * JurusanController (pola sama Subject: kode+nama).
     */
    public function up(): void
    {
        Schema::table('jurusans', function (Blueprint $table) {
            $table->string('kode', 20)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('jurusans', function (Blueprint $table) {
            $table->dropColumn('kode');
        });
    }
};
