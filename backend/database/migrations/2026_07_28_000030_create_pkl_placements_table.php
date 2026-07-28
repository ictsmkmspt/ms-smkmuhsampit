<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penempatan PKL: siswa mana, ditempatkan di DUDI mana, dibimbing guru mana,
     * untuk periode berapa. Sengaja tidak dibatasi "1 siswa cuma boleh 1 penempatan
     * seumur hidup" di level database, supaya riwayat PKL lama tetap tersimpan kalau
     * siswa pernah pindah DUDI atau PKL lebih dari 1 periode. Aturan "cuma boleh 1
     * yang aktif dalam satu waktu" ditegakkan di level aplikasi (controller), bukan
     * di sini, supaya pesan errornya bisa lebih manusiawi.
     */
    public function up(): void
    {
        Schema::create('pkl_placements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('dudi_id')->constrained('dudis')->onDelete('cascade');
            $table->foreignId('guru_pembimbing_id')->nullable()->constrained('teachers')->onDelete('set null');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->enum('status', ['aktif', 'selesai'])->default('aktif');
            $table->unsignedTinyInteger('nilai_akhir')->nullable();
            $table->text('catatan_pembimbing')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pkl_placements');
    }
};
