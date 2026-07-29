<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jurnal Pembimbing PKL — catatan kunjungan/aktivitas bimbingan guru ke SEBUAH
     * DUDI (bukan per siswa; 1 kunjungan mencakup semua siswa bimbingannya di DUDI
     * itu sekaligus). Wajib diverifikasi (diparaf) oleh Instruktur DUDI.
     */
    public function up(): void
    {
        Schema::create('pkl_pembimbingan_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('dudi_id')->constrained('dudis')->onDelete('cascade');
            $table->date('date');
            $table->text('aktivitas');
            $table->text('catatan')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pkl_pembimbingan_journals');
    }
};
