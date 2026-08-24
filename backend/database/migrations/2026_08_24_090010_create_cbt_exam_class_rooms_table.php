<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // 1 paket soal sekarang bisa didistribusikan ke BANYAK kelas sekaligus
    // (mengikuti cbtv145 distribusisoals) — sebelumnya cbt_exams.class_room_id
    // cuma 1 kelas. Data lama dipindah ke tabel pivot ini dulu sebelum kolom
    // class_room_id dihapus, supaya ujian yang sudah dibuat tidak kehilangan
    // kelasnya.
    public function up(): void
    {
        Schema::create('cbt_exam_class_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('cbt_exams')->cascadeOnDelete();
            $table->foreignId('class_room_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['exam_id', 'class_room_id']);
        });

        DB::statement('
            INSERT INTO cbt_exam_class_rooms (exam_id, class_room_id, created_at, updated_at)
            SELECT id, class_room_id, ?, ? FROM cbt_exams
        ', [now(), now()]);

        Schema::table('cbt_exams', function (Blueprint $table) {
            $table->dropForeign(['class_room_id']);
            $table->dropColumn('class_room_id');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_exams', function (Blueprint $table) {
            $table->foreignId('class_room_id')->nullable()->after('subject_id')->constrained()->cascadeOnDelete();
        });

        DB::statement('
            UPDATE cbt_exams e
            JOIN (SELECT exam_id, MIN(class_room_id) AS class_room_id FROM cbt_exam_class_rooms GROUP BY exam_id) p
            ON p.exam_id = e.id
            SET e.class_room_id = p.class_room_id
        ');

        Schema::dropIfExists('cbt_exam_class_rooms');
    }
};
