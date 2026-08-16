<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kode katalog manual per JUDUL (diisi pengurus sendiri, mis. nomor
     * klasifikasi/akuisisi) — beda dari kode_eksemplar yang auto-generate
     * per SALINAN fisik untuk QR. Nullable+unique: banyak baris kosong
     * tetap diperbolehkan (MySQL menganggap tiap NULL berbeda di kolom
     * unique).
     */
    public function up(): void
    {
        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->string('kode_buku')->nullable()->unique()->after('judul');
        });
    }

    public function down(): void
    {
        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->dropUnique(['kode_buku']);
            $table->dropColumn('kode_buku');
        });
    }
};
