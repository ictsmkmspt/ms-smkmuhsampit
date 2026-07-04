<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_rooms', function (Blueprint $table) {
            // Satu guru hanya bisa jadi wali kelas untuk 1 kelas (unique).
            // nullable supaya kelas boleh belum punya wali kelas.
            $table->foreignId('homeroom_teacher_id')
                ->nullable()
                ->after('name')
                ->constrained('teachers')
                ->onDelete('set null');

            $table->unique('homeroom_teacher_id');
        });
    }

    public function down(): void
    {
        Schema::table('class_rooms', function (Blueprint $table) {
            $table->dropUnique(['homeroom_teacher_id']);
            $table->dropConstrainedForeignId('homeroom_teacher_id');
        });
    }
};
