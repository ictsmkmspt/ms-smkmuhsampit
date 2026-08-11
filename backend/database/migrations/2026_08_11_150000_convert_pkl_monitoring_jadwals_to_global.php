<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jadwal Monitoring PKL diubah dari per-siswa/per-guru (dibuat masing-masing
 * guru pembimbing) jadi 1 jadwal GLOBAL yang dibuat admin/waka_kurikulum dan
 * berlaku untuk semua guru sekaligus — bukan lagi terikat 1 pkl_placement.
 * Tabel ini baru dibuat sesi sebelumnya dan belum pernah terisi data
 * produksi (fitur belum dirilis), jadi aman diubah strukturnya langsung
 * lewat migrasi baru (bukan drop+create ulang, supaya riwayat migrasi tetap
 * runtut).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pkl_monitoring_jadwals', function (Blueprint $table) {
            $table->dropForeign(['pkl_placement_id']);
            $table->dropColumn(['pkl_placement_id', 'status']);
            $table->string('judul')->after('tahun_ajaran_id');
            $table->date('tanggal_selesai')->nullable()->after('tanggal_rencana');
            $table->foreignId('dibuat_oleh')->nullable()->after('catatan')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pkl_monitoring_jadwals', function (Blueprint $table) {
            $table->dropForeign(['dibuat_oleh']);
            $table->dropColumn(['judul', 'tanggal_selesai', 'dibuat_oleh']);
            $table->foreignId('pkl_placement_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('status', ['direncanakan', 'selesai', 'batal'])->default('direncanakan');
        });
    }
};
