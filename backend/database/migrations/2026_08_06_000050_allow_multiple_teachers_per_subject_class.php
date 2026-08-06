<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Sebelumnya 1 mapel di 1 kelas cuma boleh 1 penugasan guru. Sekarang
    // dibolehkan lebih dari 1 guru untuk mapel+kelas yang sama (mis. team
    // teaching, atau mapel dibagi 2 guru) — yang dijaga unik cuma kombinasi
    // guru+mapel+kelas+tahun ajaran itu sendiri, supaya tidak dobel persis.
    public function up(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            // subject_id butuh index sendiri dulu sebelum unique lama boleh
            // dihapus — FK-nya "menumpang" index unique lama itu (kolom
            // pertamanya subject_id), MySQL menolak hapus index yang masih
            // dipakai FK kalau tidak ada index pengganti.
            $table->index('subject_id', 'teaching_assignments_subject_id_index');
            $table->dropUnique('teaching_assignments_unique');
            $table->unique(['teacher_id', 'subject_id', 'class_room_id', 'tahun_ajaran_id'], 'teaching_assignments_unique');
        });
    }

    public function down(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->dropUnique('teaching_assignments_unique');
            $table->unique(['subject_id', 'class_room_id', 'tahun_ajaran_id'], 'teaching_assignments_unique');
            $table->dropIndex('teaching_assignments_subject_id_index');
        });
    }
};
