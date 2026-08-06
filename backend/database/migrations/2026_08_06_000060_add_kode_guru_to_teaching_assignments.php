<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Kode guru (A, B, C, ... — atau A1/A2 kalau guru itu punya lebih dari 1
    // penugasan) dibuat lewat tombol "Generate Kode Guru", bukan diisi
    // manual saat tambah penugasan. Kode inilah yang otomatis dipakai
    // sebagai kode tampilan di Jadwal Pelajaran (lihat Schedule.kode).
    public function up(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->string('kode_guru', 10)->nullable()->after('teacher_id');
        });
    }

    public function down(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->dropColumn('kode_guru');
        });
    }
};
