<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catatan setoran Tahfidz (hafalan Al-Quran) per siswa — per juz (1-30) +
 * skor kelancaran. Ditampilkan di frontend sebagai daftar 30 juz (dikelompokkan
 * dari log ini, ambil catatan terbaru tiap juz), bukan tabel status terpisah,
 * supaya riwayat tiap setoran tetap tersimpan (bisa lebih dari 1 kali per juz
 * kalau perlu diulang/dites lagi).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tahfidz_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('juz');
            $table->unsignedTinyInteger('skor');
            $table->string('keterangan')->nullable();
            $table->date('tanggal');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tahfidz_scores');
    }
};
