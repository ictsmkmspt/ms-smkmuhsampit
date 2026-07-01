<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('attendance_id')->nullable()->constrained()->onDelete('cascade');
            $table->date('date');
            $table->enum('type', ['telat', 'alpa']);
            $table->unsignedInteger('poin');
            $table->timestamps();
            $table->unique(['student_id', 'date', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violations');
    }
};
