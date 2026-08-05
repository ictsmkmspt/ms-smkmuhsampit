<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('procurements', function (Blueprint $table) {
            $table->id();
            $table->string('nama_barang');
            $table->unsignedInteger('jumlah');
            $table->text('alasan');
            $table->enum('status', ['diajukan', 'disetujui', 'ditolak', 'dibeli'])->default('diajukan');
            $table->date('tanggal_pengajuan');
            $table->date('tanggal_realisasi')->nullable();
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procurements');
    }
};
