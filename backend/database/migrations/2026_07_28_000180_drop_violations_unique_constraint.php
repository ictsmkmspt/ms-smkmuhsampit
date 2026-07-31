<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ternyata 1 siswa memang boleh dicatat lebih dari 1 kali untuk jenis
     * pelanggaran yang SAMA di hari yang SAMA juga (misal kejadian berulang
     * dalam sehari) — jadi batasan unik di database dihapus total. Untuk
     * kasus 'alpa' (yang memang seharusnya cuma 1x per hari), itu sudah
     * dicegah lewat pengecekan di kode (AttendanceController), bukan lewat
     * database, jadi tetap aman walau constraint-nya dihapus.
     */
    public function up(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->dropUnique('violations_student_date_type_vtype_unique');
        });
    }

    public function down(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->unique(['student_id', 'date', 'type', 'violation_type_id'], 'violations_student_date_type_vtype_unique');
        });
    }
};
