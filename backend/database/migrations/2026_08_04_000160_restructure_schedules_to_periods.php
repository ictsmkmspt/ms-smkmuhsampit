<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jadwal Pelajaran diubah dari waktu bebas (hari + jam_mulai/selesai per
     * baris) jadi berbasis grid baris "periods" yang sama dipakai semua
     * kelas — supaya waktu antar kelas konsisten & bentrok otomatis tidak
     * mungkin terjadi (1 kelas cuma bisa punya 1 baris jadwal per period).
     * "kode" = kode guru yang tampil di sel grid, diisi manual (lihat PDF
     * jadwal master sekolah yang jadi acuan tampilan cetak/export).
     */
    public function up(): void
    {
        // Struktur waktu berubah total (bebas -> berbasis period bersama),
        // jadi entri lama tidak bisa dipetakan otomatis ke period baru yang
        // belum ada — dikosongkan, harus diisi ulang lewat menu Jadwal.
        DB::table('schedules')->delete();

        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn(['hari', 'jam_mulai', 'jam_selesai']);
            $table->foreignId('period_id')->after('id')->constrained()->onDelete('cascade');
            $table->string('kode', 10)->nullable()->after('teacher_id');
            $table->unique(['period_id', 'class_room_id']);
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropUnique(['period_id', 'class_room_id']);
            $table->dropConstrainedForeignId('period_id');
            $table->dropColumn('kode');
            $table->enum('hari', ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']);
            $table->time('jam_mulai');
            $table->time('jam_selesai');
        });
    }
};
