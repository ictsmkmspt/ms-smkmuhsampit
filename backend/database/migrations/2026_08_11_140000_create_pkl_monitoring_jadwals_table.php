<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jadwal kunjungan/monitoring guru pembimbing ke siswa PKL — beda dari
 * pkl_pembimbingan_journals (catatan SETELAH kunjungan terjadi, per DUDI),
 * ini adalah RENCANA jadwal ke depan, per siswa (per pkl_placement), supaya
 * guru bisa menyusun rencana kunjungan lalu menandainya selesai/batal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pkl_monitoring_jadwals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pkl_placement_id')->constrained()->onDelete('cascade');
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->date('tanggal_rencana');
            $table->enum('status', ['direncanakan', 'selesai', 'batal'])->default('direncanakan');
            $table->string('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pkl_monitoring_jadwals');
    }
};
