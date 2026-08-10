<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * kode_aset dan no_kode_barang ternyata dianggap 1 jenis kode yang
     * sama (kode barang) — digabung jadi 1 field (kode_aset saja) supaya
     * tidak dobel isian.
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn('no_kode_barang');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('no_kode_barang')->nullable()->after('bahan');
        });
    }
};
