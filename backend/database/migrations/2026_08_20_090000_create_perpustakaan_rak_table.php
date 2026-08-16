<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master data rak/lokasi buku — sama pola dengan perpustakaan_kategori,
     * supaya rak juga dipilih dari daftar, bukan diketik bebas.
     */
    public function up(): void
    {
        Schema::create('perpustakaan_rak', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perpustakaan_rak');
    }
};
