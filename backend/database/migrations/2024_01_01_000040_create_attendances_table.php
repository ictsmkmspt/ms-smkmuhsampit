<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('class_room_id')->nullable()->constrained()->onDelete('set null');
            $table->date('date');
            $table->time('time_in');
            $table->enum('status', ['hadir', 'telat'])->default('hadir');
            $table->foreignId('scanned_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->unique(['student_id', 'date']); // 1 siswa cuma bisa absen 1x per hari
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
