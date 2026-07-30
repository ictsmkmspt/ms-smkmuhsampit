<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gambar tanda tangan DUDI — dipakai menggantikan tanda centang (✓) di
     * kolom paraf pada halaman cetak jurnal, begitu DUDI memverifikasi.
     */
    public function up(): void
    {
        Schema::table('dudis', function (Blueprint $table) {
            $table->string('tanda_tangan')->nullable()->after('radius_meter');
        });
    }

    public function down(): void
    {
        Schema::table('dudis', function (Blueprint $table) {
            $table->dropColumn('tanda_tangan');
        });
    }
};
