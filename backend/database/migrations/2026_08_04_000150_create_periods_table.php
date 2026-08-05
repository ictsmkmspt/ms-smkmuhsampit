<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Baris struktur jadwal per hari — bisa berupa jam pelajaran biasa
     * (tipe "pelajaran", diisi per kelas lewat tabel schedules) atau blok
     * kegiatan khusus yang membentang penuh 1 baris lintas semua kelas
     * (tipe "khusus", mis. Upacara/Istirahat/Sholat/Pulang), supaya struktur
     * hari bisa diatur bebas tanpa hardcode template tertentu.
     */
    public function up(): void
    {
        Schema::create('periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('hari', ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']);
            $table->string('jam_ke', 10)->nullable();
            $table->time('waktu_mulai');
            $table->time('waktu_selesai');
            $table->enum('tipe', ['pelajaran', 'khusus']);
            $table->string('label_khusus')->nullable();
            $table->string('warna', 7)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('periods');
    }
};
