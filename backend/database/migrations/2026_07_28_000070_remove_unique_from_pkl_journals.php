<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Siswa boleh mengisi lebih dari 1 kegiatan dalam 1 hari (misal beda jam,
     * beda pekerjaan) — jadi batasan "1 baris per tanggal" dilepas di sini.
     *
     * Dilakukan 2 langkah terpisah: buat index biasa di pkl_placement_id DULU,
     * baru hapus unique index-nya — karena MySQL menolak menghapus index yang
     * masih dipakai untuk menopang foreign key kalau tidak ada index pengganti.
     */
    public function up(): void
    {
        Schema::table('pkl_journals', function (Blueprint $table) {
            $table->index('pkl_placement_id', 'pkl_journals_placement_id_idx');
        });

        Schema::table('pkl_journals', function (Blueprint $table) {
            $table->dropUnique(['pkl_placement_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::table('pkl_journals', function (Blueprint $table) {
            $table->dropIndex('pkl_journals_placement_id_idx');
            $table->unique(['pkl_placement_id', 'date']);
        });
    }
};
