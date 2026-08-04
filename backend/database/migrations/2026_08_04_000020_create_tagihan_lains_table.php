<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tagihan di luar SPP bulanan — buat biaya yang sifatnya tidak tetap
     * atau insidental (study tour, seragam, ujian praktik, dsb). Beda dari
     * SPP yang terikat bulan/tahun, di sini tagihan punya nama bebas
     * ("nama_tagihan") supaya TU bisa buat jenis tagihan apa saja.
     */
    public function up(): void
    {
        Schema::create('tagihan_lains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->string('nama_tagihan');
            $table->unsignedInteger('nominal');
            $table->enum('status', ['belum_bayar', 'lunas'])->default('belum_bayar');
            $table->date('tanggal_bayar')->nullable();
            $table->text('keterangan')->nullable();
            $table->foreignId('dicatat_oleh')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tagihan_lains');
    }
};
