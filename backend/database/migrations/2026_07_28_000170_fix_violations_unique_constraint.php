<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Constraint unik lama (student_id, date, type) awalnya masuk akal waktu
     * "type" cuma 'telat'/'alpa' (memang seharusnya cuma 1 kejadian per hari).
     * Tapi sekarang 'manual' dipakai untuk BANYAK jenis pelanggaran berbeda
     * (lewat violation_type_id) — jadi 1 siswa harus bisa punya lebih dari 1
     * pelanggaran manual di hari yang sama, selama jenisnya berbeda.
     *
     * Constraint baru: unik per (student_id, date, type, violation_type_id) —
     * tetap mencegah dobel-klik jenis yang SAMA di hari yang SAMA, tapi
     * mengizinkan jenis pelanggaran yang BEDA di hari yang sama.
     *
     * Dipecah 3 langkah supaya aman di MySQL: (1) buat index biasa di
     * student_id dulu — supaya foreign key-nya tetap punya index penopang,
     * (2) baru hapus unique index lama, (3) baru tambah unique index baru.
     */
    public function up(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->index('student_id', 'violations_student_id_idx');
        });

        Schema::table('violations', function (Blueprint $table) {
            $table->dropUnique('violations_student_id_date_type_unique');
        });

        Schema::table('violations', function (Blueprint $table) {
            $table->unique(['student_id', 'date', 'type', 'violation_type_id'], 'violations_student_date_type_vtype_unique');
        });
    }

    public function down(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->dropUnique('violations_student_date_type_vtype_unique');
        });

        Schema::table('violations', function (Blueprint $table) {
            $table->unique(['student_id', 'date', 'type'], 'violations_student_id_date_type_unique');
        });

        Schema::table('violations', function (Blueprint $table) {
            $table->dropIndex('violations_student_id_idx');
        });
    }
};
