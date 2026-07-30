<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jurnal Pembimbing PKL — beda dari pkl_journals (yang diisi siswa) dan
     * pkl_attendances (yang soal jam masuk/pulang siswa). Ini catatan kunjungan/
     * aktivitas BIMBINGAN yang dilakukan GURU PEMBIMBING ke siswa/DUDI, lengkap
     * dengan temuan/masalah, dan wajib diparaf (diverifikasi) oleh Instruktur DUDI
     * mengikuti format jurnal kertas yang biasa dipakai sekolah.
     */
    public function up(): void
    {
        Schema::create('pkl_pembimbingan_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pkl_placement_id')->constrained()->onDelete('cascade');
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
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
