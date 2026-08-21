<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cbt_tab_switch_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('cbt_exam_attempts')->onDelete('cascade');
            $table->string('event_type');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbt_tab_switch_logs');
    }
};
