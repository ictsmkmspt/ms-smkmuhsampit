<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Materi bacaan sederhana (artikel + gambar sampul) yang guru terbitkan
    // dan siswa baca — TERPISAH dari LMS Gamifikasi (XP/level/misi) yang
    // sengaja tidak dipasang lagi; ini murni versi ringan cbtv145 (tabel
    // materis lama): guru tulis, siswa baca, hits dihitung.
    public function up(): void
    {
        Schema::create('cbt_materi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->string('judul');
            $table->longText('isi');
            $table->string('gambar_path')->nullable();
            $table->string('status', 10)->default('draft'); // draft | terbit
            $table->unsignedInteger('hits')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbt_materi');
    }
};
