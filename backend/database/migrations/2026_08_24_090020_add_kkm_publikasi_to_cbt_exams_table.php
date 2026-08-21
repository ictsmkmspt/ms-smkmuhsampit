<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // kkm: nilai minimum lulus (opsional, ditampilkan di hasil — tidak
    // memengaruhi perhitungan skor). status_publikasi: gerbang terpisah
    // dari status "selesai" — guru sengaja menekan "Publikasikan Nilai"
    // baru siswa bisa lihat skor/pembahasan ujian TIPE UJIAN (latihan
    // selalu langsung kelihatan begitu attempt submitted, tidak lewat
    // gerbang ini — lihat StudentExamController::show()).
    public function up(): void
    {
        Schema::table('cbt_exams', function (Blueprint $table) {
            $table->unsignedTinyInteger('kkm')->nullable()->after('durasi_menit');
            $table->boolean('status_publikasi')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_exams', function (Blueprint $table) {
            $table->dropColumn(['kkm', 'status_publikasi']);
        });
    }
};
