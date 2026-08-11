<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catatan setoran Tahsin (perbaikan bacaan Al-Quran) per siswa — jilid 1-6
 * + halaman yang dibaca saat itu, dan skor kelancaran (0-100), sama polanya
 * dengan academic_scores tapi dimensi kegiatannya jilid+halaman, bukan nama
 * kegiatan bebas. Tidak dibatasi guru pengampu mapel tertentu — semua guru
 * boleh mencatat (beda dari academic_scores yang dikunci ke TeachingAssignment).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tahsin_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('jilid');
            $table->unsignedInteger('halaman');
            $table->unsignedTinyInteger('skor');
            $table->string('keterangan')->nullable();
            $table->date('tanggal');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tahsin_scores');
    }
};
