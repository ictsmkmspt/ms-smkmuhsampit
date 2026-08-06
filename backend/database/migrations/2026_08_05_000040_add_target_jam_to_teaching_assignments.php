<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Target total jam pelajaran yang harus ditempatkan Waka Kurikulum ke
     * Jadwal Pelajaran untuk penugasan ini (opsional — dibiarkan kosong
     * kalau memang tidak dipatok jamnya, mengingat struktur kurikulum SMK
     * ada yang berbentuk blok/tahunan, bukan selalu rata per minggu).
     */
    public function up(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->unsignedInteger('target_jam')->nullable()->after('class_room_id');
        });
    }

    public function down(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->dropColumn('target_jam');
        });
    }
};
