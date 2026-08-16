<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * FK eksemplar_id semula cascadeOnDelete — artinya menghapus 1
     * eksemplar (yang lolos guard status 'dipinjam' di controller) diam-
     * diam ikut menghapus SELURUH riwayat peminjaman eksemplar itu. Diganti
     * jadi RESTRICT (default InnoDB) supaya database sendiri menolak hapus
     * eksemplar yang masih punya riwayat — lapisan pertahanan kedua di
     * belakang guard aplikasi di BukuController::hapusEksemplar()/destroy().
     */
    public function up(): void
    {
        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->dropForeign(['eksemplar_id']);
        });
        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->foreign('eksemplar_id')->references('id')->on('perpustakaan_eksemplar')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->dropForeign(['eksemplar_id']);
        });
        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->foreign('eksemplar_id')->references('id')->on('perpustakaan_eksemplar')->cascadeOnDelete();
        });
    }
};
