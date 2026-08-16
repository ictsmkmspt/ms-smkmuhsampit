<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Riwayat pembayaran Tagihan Lain — sama persis pola spp_pembayaran.
    public function up(): void
    {
        Schema::create('tagihan_lain_pembayaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tagihan_lain_id')->constrained('tagihan_lains')->cascadeOnDelete();
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
        Schema::dropIfExists('tagihan_lain_pembayaran');
    }
};
