<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bank Soal SENGAJA privat secara default (dibagikan=false) — guru lain
 * yang mengajar mapel sama TIDAK otomatis bisa lihat semua Bank Soal
 * begitu saja, cuma yang sudah ditandai "dibagikan" lewat tombol Share di
 * frontend (lihat CbtBankSoalController::toggleShare() &
 * CbtBankSoalController::lain() yang sekarang ikut menyaring kolom ini).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_bank_soal', function (Blueprint $table) {
            $table->boolean('dibagikan')->default(false)->after('nama');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_bank_soal', function (Blueprint $table) {
            $table->dropColumn('dibagikan');
        });
    }
};
