<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_exam_answers', function (Blueprint $table) {
            $table->longText('jawaban_essay')->nullable()->after('jawaban_dipilih');
            $table->unsignedInteger('nilai_essay')->nullable()->after('jawaban_essay');
            $table->string('status_koreksi', 10)->default('belum')->after('nilai_essay');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE cbt_exam_answers MODIFY jawaban_dipilih ENUM('A','B','C','D','E') NULL");
        } else {
            Schema::table('cbt_exam_answers', function (Blueprint $table) {
                $table->enum('jawaban_dipilih', ['A', 'B', 'C', 'D', 'E'])->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE cbt_exam_answers MODIFY jawaban_dipilih ENUM('A','B','C','D') NULL");
        } else {
            Schema::table('cbt_exam_answers', function (Blueprint $table) {
                $table->enum('jawaban_dipilih', ['A', 'B', 'C', 'D'])->nullable()->change();
            });
        }

        Schema::table('cbt_exam_answers', function (Blueprint $table) {
            $table->dropColumn(['jawaban_essay', 'nilai_essay', 'status_koreksi']);
        });
    }
};
