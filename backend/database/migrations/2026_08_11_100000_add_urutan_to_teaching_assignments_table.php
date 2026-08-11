<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Urutan baris Daftar Penugasan sekarang bisa diatur manual (drag-and-drop
 * di tabel) — sebelumnya selalu diurutkan otomatis berdasarkan kode mata
 * pelajaran. Data lama dibackfill pakai urutan tampilan lama itu supaya
 * tabel tidak berubah posisi tiba-tiba saat fitur ini pertama kali aktif.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->integer('urutan')->nullable()->after('target_jam');
        });

        $rows = DB::table('teaching_assignments')
            ->join('subjects', 'subjects.id', '=', 'teaching_assignments.subject_id')
            ->orderBy('teaching_assignments.tahun_ajaran_id')
            ->orderBy('subjects.kode')
            ->select('teaching_assignments.id', 'teaching_assignments.tahun_ajaran_id')
            ->get();

        $counter = [];
        foreach ($rows as $row) {
            $tahunId = $row->tahun_ajaran_id;
            $counter[$tahunId] = ($counter[$tahunId] ?? -1) + 1;
            DB::table('teaching_assignments')->where('id', $row->id)->update(['urutan' => $counter[$tahunId]]);
        }
    }

    public function down(): void
    {
        Schema::table('teaching_assignments', function (Blueprint $table) {
            $table->dropColumn('urutan');
        });
    }
};
