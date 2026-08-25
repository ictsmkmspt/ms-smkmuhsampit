<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "cv" = 1 file PDF, WAJIB (dicek lewat Student::getBiodataLengkapAttribute()).
 * "sertifikat" = daftar file (PDF/gambar), disimpan JSON array berisi
 * {id, nama, file} per item — bisa lebih dari 1, ditambah satu per satu
 * lewat StudentSelfController::uploadMySertifikat(). Sertifikat TETAP
 * opsional, tidak ikut dicek biodata_lengkap.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('cv')->nullable()->after('pengalaman_kerja');
            $table->json('sertifikat')->nullable()->after('cv');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['cv', 'sertifikat']);
        });
    }
};
