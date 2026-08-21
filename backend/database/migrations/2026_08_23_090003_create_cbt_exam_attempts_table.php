<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cbt_exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained('cbt_exams')->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['in_progress', 'submitted'])->default('in_progress');
            $table->dateTime('started_at');
            $table->dateTime('submitted_at')->nullable();
            $table->decimal('skor', 5, 2)->nullable();
            $table->unsignedInteger('tab_switch_count')->default(0);
            $table->timestamps();
            $table->unique(['exam_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbt_exam_attempts');
    }
};
