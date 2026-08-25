<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_vacancies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iduka_id')->constrained()->cascadeOnDelete();
            $table->foreignId('jurusan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('posisi', 150);
            $table->text('deskripsi');
            $table->text('kualifikasi')->nullable();
            $table->string('gaji', 100)->nullable();
            $table->string('foto_brosur')->nullable();
            $table->unsignedInteger('kuota')->nullable();
            $table->date('tanggal_tutup')->nullable();
            // draf = baru diisi IDUKA, menunggu diverifikasi Waka Humas;
            // dibuka = disetujui & tayang publik; ditutup = tidak lagi
            // menerima lamaran (kuota penuh / manual ditutup).
            $table->enum('status', ['draf', 'dibuka', 'ditutup'])->default('draf');
            $table->text('catatan_revisi')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_vacancies');
    }
};
