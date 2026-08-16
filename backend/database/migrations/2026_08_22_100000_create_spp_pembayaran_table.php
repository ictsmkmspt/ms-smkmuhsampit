<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Riwayat pembayaran SPP — 1 baris per SETORAN (bukan per tagihan).
     * Sebelumnya 1 tagihan SPP cuma punya 1 kolom tanggal_bayar +
     * jumlah_dibayar akumulatif, jadi cicilan lintas bulan (bayar sebagian
     * bulan Januari, lanjut Februari) bikin tanggal_bayar tertimpa dan
     * laporan kas per-bulan salah hitung. Kolom jumlah_dibayar &
     * tanggal_bayar di tabel spps TETAP ada (dipakai sebagai ringkasan
     * ter-cache: total & tanggal setoran TERAKHIR), tapi laporan keuangan
     * sekarang membaca dari tabel riwayat ini supaya tiap setoran
     * terhitung di bulan dia benar-benar diterima.
     */
    public function up(): void
    {
        Schema::create('spp_pembayaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spp_id')->constrained('spps')->cascadeOnDelete();
            $table->unsignedInteger('jumlah');
            $table->date('tanggal_bayar');
            $table->foreignId('dicatat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->string('keterangan')->nullable();
            $table->timestamps();
            $table->index(['tanggal_bayar']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spp_pembayaran');
    }
};
