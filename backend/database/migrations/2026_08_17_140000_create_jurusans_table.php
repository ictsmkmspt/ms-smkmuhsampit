<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master data jurusan siswa — supaya jurusan TERKONTROL (dipilih dari
     * daftar yang dikelola Admin di Pengaturan), bukan diketik bebas per
     * siswa. Pola sama seperti perpustakaan_kategori.
     */
    public function up(): void
    {
        Schema::create('jurusans', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jurusans');
    }
};
