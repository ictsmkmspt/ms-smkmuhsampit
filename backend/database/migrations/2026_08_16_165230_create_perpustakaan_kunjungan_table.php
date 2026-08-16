<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catatan kunjungan Perpustakaan — berdiri sendiri, TIDAK berelasi ke
     * perpustakaan_peminjaman (kunjungan bukan cuma soal pinjam buku, tapi
     * juga baca/tugas/internet/dll). pengunjung_type/pengunjung_id pakai
     * morph map 'siswa'/'guru' yang sudah terdaftar di AppServiceProvider,
     * sama seperti peminjam_type/peminjam_id di perpustakaan_peminjaman.
     */
    public function up(): void
    {
        Schema::create('perpustakaan_kunjungan', function (Blueprint $table) {
            $table->id();
            $table->string('pengunjung_type');
            $table->unsignedBigInteger('pengunjung_id');
            $table->string('keperluan', 100);
            $table->date('tanggal');
            $table->foreignId('dicatat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['pengunjung_type', 'pengunjung_id']);
            $table->index('tanggal');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpustakaan_kunjungan');
    }
};
