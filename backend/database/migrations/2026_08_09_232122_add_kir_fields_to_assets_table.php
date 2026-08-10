<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Field tambahan supaya kolom Kartu Inventaris Ruangan (KIR) bisa
     * terisi lengkap: Merk/Model, No. Seri Pabrik, Ukuran, Bahan, No. Kode
     * Barang (kode inventaris formal ala BMN, beda dari kode_aset yang
     * dipakai buat QR/barcode per unit).
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('merk_model')->nullable()->after('kategori');
            $table->string('no_seri_pabrik')->nullable()->after('merk_model');
            $table->string('ukuran')->nullable()->after('no_seri_pabrik');
            $table->string('bahan')->nullable()->after('ukuran');
            $table->string('no_kode_barang')->nullable()->after('bahan');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn(['merk_model', 'no_seri_pabrik', 'ukuran', 'bahan', 'no_kode_barang']);
        });
    }
};
