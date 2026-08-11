<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catatan Tadarus (membaca Al-Quran, bukan menghafal) per siswa — surah
 * (nomor 1-114, lihat config/quran_surah.php) + rentang ayat yang dibaca
 * saat itu, dan skor kelancaran.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tadarus_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('ayat_mulai');
            $table->unsignedSmallInteger('ayat_selesai');
            $table->unsignedTinyInteger('skor');
            $table->string('keterangan')->nullable();
            $table->date('tanggal');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tadarus_scores');
    }
};
