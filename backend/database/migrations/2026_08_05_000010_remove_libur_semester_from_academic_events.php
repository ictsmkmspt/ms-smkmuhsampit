<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jenis "Libur Semester" dihapus dari Kalender Akademik — sudah
     * tercakup di Kalender Libur (yang sekarang satu halaman dengannya),
     * jadi tidak perlu dicatat dua kali dengan cara berbeda.
     */
    public function up(): void
    {
        Schema::table('academic_events', function (Blueprint $table) {
            $table->enum('jenis', ['semester_ganjil', 'semester_genap', 'uts', 'uas', 'pas', 'pat', 'kegiatan', 'lainnya'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('academic_events', function (Blueprint $table) {
            $table->enum('jenis', ['semester_ganjil', 'semester_genap', 'uts', 'uas', 'pas', 'pat', 'libur_semester', 'kegiatan', 'lainnya'])->change();
        });
    }
};
