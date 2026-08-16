<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tidak ada entitas "kegiatan" tersendiri — 1 kegiatan cuma identitas
     * implisit (subject_id + tahun_ajaran_id + nama_kegiatan + tanggal)
     * yang dibagi banyak baris AcademicScore (1 per siswa). Tanpa unique
     * ini, 2 batch storeBulk() terpisah dengan nama+tanggal yang sama
     * persis bisa membuat 1 siswa punya 2 baris skor untuk "kegiatan" yang
     * (seharusnya) sama — dan exportExcel() cuma menyimpan 1 skor per
     * (tanggal||nama) di array PHP, jadi salah satu skornya diam-diam
     * hilang/tertimpa di file Excel yang diekspor & dicetak.
     */
    public function up(): void
    {
        Schema::table('academic_scores', function (Blueprint $table) {
            $table->unique(
                ['student_id', 'subject_id', 'tahun_ajaran_id', 'nama_kegiatan', 'tanggal'],
                'academic_scores_kegiatan_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('academic_scores', function (Blueprint $table) {
            $table->dropUnique('academic_scores_kegiatan_unique');
        });
    }
};
