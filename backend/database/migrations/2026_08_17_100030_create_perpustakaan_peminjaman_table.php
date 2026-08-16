<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * status: dipinjam|dikembalikan|rusak|hilang — "terlambat" SENGAJA
     * tidak disimpan sebagai kolom, dihitung saat baca dari
     * (status=dipinjam && tanggal_jatuh_tempo < hari ini). Tidak ada
     * kolom denda/perpanjangan (di luar cakupan versi ini).
     */
    public function up(): void
    {
        Schema::create('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->id();
            $table->foreignId('eksemplar_id')->constrained('perpustakaan_eksemplar')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('diproses_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->date('tanggal_pinjam');
            $table->date('tanggal_jatuh_tempo');
            $table->date('tanggal_kembali')->nullable();
            $table->enum('status', ['dipinjam', 'dikembalikan', 'rusak', 'hilang'])->default('dipinjam');
            $table->timestamps();

            $table->index(['student_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpustakaan_peminjaman');
    }
};
