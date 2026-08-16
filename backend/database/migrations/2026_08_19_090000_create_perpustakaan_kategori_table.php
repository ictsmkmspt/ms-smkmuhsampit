<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master data kategori buku — supaya kategori TERKONTROL (dipilih dari
     * daftar), bukan diketik bebas per buku (pola sama ViolationType).
     */
    public function up(): void
    {
        Schema::create('perpustakaan_kategori', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpustakaan_kategori');
    }
};
