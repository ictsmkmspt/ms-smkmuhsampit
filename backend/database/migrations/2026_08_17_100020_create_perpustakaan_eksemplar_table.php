<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 1 baris = 1 salinan fisik buku, dengan kode QR unik sendiri
     * ('BUKU-XXXXXXXX', format aman dipakai di path segment rute — lihat
     * pola Student::barcode_code, BUKAN pola Asset::kode_aset yang butuh
     * query-string karena bisa mengandung '/').
     *
     * status: tersedia|dipinjam|rusak|hilang — eksemplar rusak/hilang
     * TIDAK bisa dipinjamkan lagi sampai pengurus reset manual ke
     * tersedia (mis. setelah diperbaiki/diganti).
     */
    public function up(): void
    {
        Schema::create('perpustakaan_eksemplar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buku_id')->constrained('perpustakaan_buku')->cascadeOnDelete();
            $table->string('kode_eksemplar')->unique();
            $table->enum('status', ['tersedia', 'dipinjam', 'rusak', 'hilang'])->default('tersedia');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpustakaan_eksemplar');
    }
};
