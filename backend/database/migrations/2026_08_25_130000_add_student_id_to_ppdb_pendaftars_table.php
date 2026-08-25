<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tautan ke Student hasil konversi ("Jadikan Siswa") — sekaligus jadi
 * penanda "pendaftar ini sudah ditarik jadi siswa aktif" supaya tidak bisa
 * dikonversi dobel (lihat PpdbController::jadikanSiswa()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable()->after('status')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->dropConstrainedForeignId('student_id');
        });
    }
};
