<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bank Soal jadi wadah bernama (mis. "Bank Soal UH 1", "Bank Soal UAS")
 * di dalam 1 mata pelajaran — 1 guru & 1 mapel bisa punya banyak wadah
 * sekaligus, soal ditulis DI DALAM 1 wadah (lihat migrasi berikutnya yang
 * menambah bank_id ke cbt_questions). SENGAJA tidak ada tahun_ajaran_id —
 * sama seperti cbt_questions sendiri, wadah ini dipakai berulang tiap
 * tahun ajaran, tidak boleh "hilang" saat tahun ajaran ganti.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cbt_bank_soal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->string('nama', 150);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbt_bank_soal');
    }
};
