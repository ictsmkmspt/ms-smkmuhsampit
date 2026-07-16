<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievement_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('poin');
            $table->timestamps();
        });

        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('achievement_type_id')->constrained('achievement_types');
            $table->date('date');
            $table->unsignedInteger('poin');
            $table->string('note')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        Schema::table('students', function (Blueprint $table) {
            $table->unsignedInteger('total_prestasi')->default(0)->after('total_poin');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('total_prestasi');
        });
        Schema::dropIfExists('achievements');
        Schema::dropIfExists('achievement_types');
    }
};
