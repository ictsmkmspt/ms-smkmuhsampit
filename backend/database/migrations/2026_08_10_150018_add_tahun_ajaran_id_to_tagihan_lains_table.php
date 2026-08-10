<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tagihan Lain dulu tidak punya konsep tahun ajaran sama sekali —
     * semua tagihan dari tahun manapun menumpuk jadi satu selamanya, tidak
     * ada cara menyaring cuma tahun berjalan. Data lama (belum ada kolom
     * ini) diisi ke tahun ajaran yang aktif SAAT MIGRASI INI DIJALANKAN
     * (asumsi paling wajar untuk data yang sudah ada — supaya tidak ada
     * baris yang mendadak hilang dari tampilan begitu fitur ini aktif).
     */
    public function up(): void
    {
        Schema::table('tagihan_lains', function (Blueprint $table) {
            $table->foreignId('tahun_ajaran_id')->nullable()->after('student_id')->constrained()->nullOnDelete();
        });

        $aktifId = DB::table('tahun_ajarans')->where('status', 'aktif')->value('id');
        if ($aktifId) {
            DB::table('tagihan_lains')->whereNull('tahun_ajaran_id')->update(['tahun_ajaran_id' => $aktifId]);
        }
    }

    public function down(): void
    {
        Schema::table('tagihan_lains', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tahun_ajaran_id');
        });
    }
};
