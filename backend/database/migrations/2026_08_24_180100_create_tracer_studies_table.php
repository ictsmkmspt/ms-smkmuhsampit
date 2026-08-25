<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tracer_studies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->enum('status_saat_ini', ['bekerja', 'melanjutkan_kuliah', 'wirausaha', 'mencari_kerja']);
            $table->string('nama_perusahaan')->nullable();
            $table->unsignedInteger('masa_tunggu_bulan')->nullable();
            $table->timestamps();
            // 1 alumni cuma 1 catatan tracer — isi ulang berarti update, bukan
            // tambah baris baru (statusnya bisa berubah dari waktu ke waktu).
            $table->unique('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracer_studies');
    }
};
