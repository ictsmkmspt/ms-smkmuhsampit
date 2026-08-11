<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tahsin/Tahfidz/Tadarus tidak terikat tahun ajaran — progres bacaan/hafalan
 * Al-Quran murid berjalan terus lintas tahun, bukan sesuatu yang "reset"
 * tiap ganti tahun ajaran seperti Nilai Akademik atau Poin.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['tahsin_scores', 'tahfidz_scores', 'tadarus_scores'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('tahun_ajaran_id');
            });
        }
    }

    public function down(): void
    {
        foreach (['tahsin_scores', 'tahfidz_scores', 'tadarus_scores'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('tahun_ajaran_id')->nullable()->after('student_id')->constrained()->nullOnDelete();
            });
        }
    }
};
