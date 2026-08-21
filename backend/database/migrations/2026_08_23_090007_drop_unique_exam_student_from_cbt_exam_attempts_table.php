<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah index biasa DULU sebelum drop unique — kolom exam_id
        // dipakai foreign key, MySQL butuh minimal 1 index yang menutupinya
        // setiap saat, jadi urutannya tidak bisa dibalik.
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->index(['exam_id', 'student_id'], 'cbt_exam_attempts_exam_student_idx');
        });
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->dropUnique(['exam_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->unique(['exam_id', 'student_id']);
        });
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->dropIndex('cbt_exam_attempts_exam_student_idx');
        });
    }
};
