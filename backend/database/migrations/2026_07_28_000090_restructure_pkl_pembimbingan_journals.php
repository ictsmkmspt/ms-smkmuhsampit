<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jurnal Pembimbing PKL diubah dari "per siswa" jadi "per kunjungan ke DUDI"
     * (1 kunjungan bisa mencakup banyak siswa sekaligus di DUDI yang sama) — sesuai
     * format jurnal kertas yang cuma punya 1 kolom "Tempat PKL", bukan per siswa.
     *
     * Dipecah 2 langkah terpisah (drop foreign key dulu, baru drop kolom + tambah
     * kolom baru) supaya aman di MySQL — menghindari masalah index yang masih
     * dipakai FK kalau semuanya digabung jadi 1 ALTER TABLE.
     */
    public function up(): void
    {
        Schema::table('pkl_pembimbingan_journals', function (Blueprint $table) {
            $table->dropForeign(['pkl_placement_id']);
        });

        Schema::table('pkl_pembimbingan_journals', function (Blueprint $table) {
            $table->dropColumn('pkl_placement_id');
            $table->foreignId('dudi_id')->after('teacher_id')->constrained('dudis')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('pkl_pembimbingan_journals', function (Blueprint $table) {
            $table->dropForeign(['dudi_id']);
            $table->dropColumn('dudi_id');
        });

        Schema::table('pkl_pembimbingan_journals', function (Blueprint $table) {
            $table->foreignId('pkl_placement_id')->after('id')->constrained()->onDelete('cascade');
        });
    }
};
