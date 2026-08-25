<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Scan/foto KTP alumni — 1 file, WAJIB (dicek lewat
 * Student::getBiodataLengkapAttribute()) sebelum alumni bisa melamar
 * lowongan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('ktp')->nullable()->after('foto');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('ktp');
        });
    }
};
