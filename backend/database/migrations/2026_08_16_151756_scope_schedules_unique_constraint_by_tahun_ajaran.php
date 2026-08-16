<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Unique (period_id, class_room_id) sebelumnya GLOBAL lintas tahun
     * ajaran — period_id sekarang dipakai bersama semua tahun ajaran
     * (lihat migration restructure_schedules_to_periods), jadi begitu 1
     * baris jadwal dibuat untuk kelas+jam tertentu di 1 tahun ajaran, DB
     * menolak baris jadwal manapun dengan kombinasi period_id+class_room_id
     * yang sama di tahun ajaran BERIKUTNYA — jadwal sama sekali tidak bisa
     * dibuat ulang tiap tahun ajaran baru untuk slot yang sama.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            // MySQL menolak drop index lama duluan karena masih dipakai
            // menopang FK class_room_id — tambah index baru dulu, baru
            // index lama boleh dibuang.
            $table->unique(['period_id', 'class_room_id', 'tahun_ajaran_id']);
        });
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropUnique(['period_id', 'class_room_id']);
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->unique(['period_id', 'class_room_id']);
        });
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropUnique(['period_id', 'class_room_id', 'tahun_ajaran_id']);
        });
    }
};
