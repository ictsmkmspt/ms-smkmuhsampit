<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Kategori" tidak ada di kolom Kartu Inventaris Ruangan (KIR) resmi —
     * dihapus supaya field aset persis mengikuti kolom KIR.
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn('kategori');
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->string('kategori')->nullable()->after('nama');
        });
    }
};
