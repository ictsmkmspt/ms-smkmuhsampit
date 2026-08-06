<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jadwal Pelajaran sekarang WAJIB ditempatkan dari Tugas Mengajar yang
     * sudah ada (bukan isi bebas mapel+guru per sel lagi) — supaya subject_id
     * & teacher_id di sini tidak mungkin menyimpang dari penugasan resminya,
     * dan jam yang sudah ditempatkan bisa dihitung otomatis per penugasan
     * (schedules_count vs target_jam). Tabel schedules masih kosong di
     * produksi (belum dipakai operasional), jadi aman dibuat wajib langsung
     * tanpa perlu backfill.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->foreignId('teaching_assignment_id')->after('period_id')->constrained()->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropConstrainedForeignId('teaching_assignment_id');
        });
    }
};
