<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 2 perubahan sekaligus atas permintaan user, tabel-tabel ini belum pernah
 * terisi data produksi (fitur baru dirilis, sudah diverifikasi kosong):
 * 1. Kolom `skor` dihapus dari tahsin_scores/tahfidz_scores/tadarus_scores
 *    — Tahsin/Tahfidz/Tadarus jadi murni catatan progres + keterangan
 *    kualitatif, tanpa angka 0-100.
 * 2. tahfidz_scores diubah dari `juz` (pilih langsung 1-30) jadi
 *    `surah`+`ayat_mulai`+`ayat_selesai` (sama seperti tadarus_scores) —
 *    hafalan dicatat per ayat yang benar-benar dihafal, bukan langsung
 *    pilih nomor juz (praktik hafalan sebenarnya per surah/ayat, juz
 *    cuma pembagian 1/30 volume, tidak selaras batas surah).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tahsin_scores', function (Blueprint $table) {
            $table->dropColumn('skor');
        });

        Schema::table('tahfidz_scores', function (Blueprint $table) {
            $table->dropColumn(['juz', 'skor']);
            $table->unsignedTinyInteger('surah')->after('tahun_ajaran_id');
            $table->unsignedSmallInteger('ayat_mulai')->after('surah');
            $table->unsignedSmallInteger('ayat_selesai')->after('ayat_mulai');
        });

        Schema::table('tadarus_scores', function (Blueprint $table) {
            $table->dropColumn('skor');
        });
    }

    public function down(): void
    {
        Schema::table('tahsin_scores', function (Blueprint $table) {
            $table->unsignedTinyInteger('skor')->after('halaman');
        });

        Schema::table('tahfidz_scores', function (Blueprint $table) {
            $table->dropColumn(['surah', 'ayat_mulai', 'ayat_selesai']);
            $table->unsignedTinyInteger('juz')->after('tahun_ajaran_id');
            $table->unsignedTinyInteger('skor')->after('juz');
        });

        Schema::table('tadarus_scores', function (Blueprint $table) {
            $table->unsignedTinyInteger('skor')->after('ayat_selesai');
        });
    }
};
