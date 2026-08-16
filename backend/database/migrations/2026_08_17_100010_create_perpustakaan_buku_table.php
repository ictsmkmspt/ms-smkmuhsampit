<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Judul buku (katalog) — TERPISAH dari eksemplar (salinan fisik, lihat
     * migrasi berikutnya). 1 judul bisa punya banyak eksemplar, tiap
     * eksemplar QR-nya sendiri, supaya sistem tahu persis salinan mana
     * yang sedang dipinjam siapa.
     */
    public function up(): void
    {
        Schema::create('perpustakaan_buku', function (Blueprint $table) {
            $table->id();
            $table->string('judul');
            $table->string('penulis')->nullable();
            $table->string('penerbit')->nullable();
            $table->unsignedSmallInteger('tahun_terbit')->nullable();
            $table->string('isbn')->nullable();
            $table->string('kategori')->nullable();
            $table->text('sinopsis')->nullable();
            $table->string('cover')->nullable();
            $table->string('rak_lokasi')->nullable();
            $table->foreignId('dibuat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpustakaan_buku');
    }
};
