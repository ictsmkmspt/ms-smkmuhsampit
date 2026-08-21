<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cbt_exam_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('cbt_exam_attempts')->onDelete('cascade');
            $table->foreignId('question_id')->constrained('cbt_questions')->onDelete('cascade');
            $table->enum('jawaban_dipilih', ['A', 'B', 'C', 'D'])->nullable();
            $table->boolean('is_correct')->nullable();
            $table->timestamps();
            $table->unique(['attempt_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbt_exam_answers');
    }
};
