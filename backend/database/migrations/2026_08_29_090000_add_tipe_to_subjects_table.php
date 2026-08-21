<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kelompok mata pelajaran ala SMK: "umum" (normatif/adaptif, mis.
 * Matematika, PPKn) vs "kejuruan" (produktif, spesifik jurusan). Sekadar
 * label kategori — TIDAK mengubah aturan Tugas Mengajar apa pun. 1
 * mapel+kelas boleh diampu lebih dari 1 guru sekaligus (team teaching)
 * sudah berlaku untuk SEMUA mapel sejak migrasi
 * allow_multiple_teachers_per_subject_class, bukan cuma kejuruan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->enum('tipe', ['umum', 'kejuruan'])->default('umum')->after('nama');
        });
    }

    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropColumn('tipe');
        });
    }
};
