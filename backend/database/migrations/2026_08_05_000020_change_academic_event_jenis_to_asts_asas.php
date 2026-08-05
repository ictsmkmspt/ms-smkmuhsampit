<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * UTS/UAS/PAS/PAT diganti istilah ASTS/ASAS (mengikuti sebutan asesmen
     * di Kurikulum Merdeka), dan jenis "Kegiatan"/"Lainnya" dihapus —
     * Kalender Akademik cuma menyisakan jenis semester + 2 asesmen ini.
     */
    public function up(): void
    {
        // Baris lama dengan jenis yang sudah tidak ada di enum baru wajib
        // dibereskan dulu, kalau tidak MySQL menolak ALTER kolomnya.
        DB::table('academic_events')->whereIn('jenis', ['uts', 'uas', 'pas', 'pat', 'kegiatan', 'lainnya'])->delete();

        Schema::table('academic_events', function (Blueprint $table) {
            $table->enum('jenis', ['semester_ganjil', 'semester_genap', 'asts', 'asas'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('academic_events', function (Blueprint $table) {
            $table->enum('jenis', ['semester_ganjil', 'semester_genap', 'uts', 'uas', 'pas', 'pat', 'kegiatan', 'lainnya'])->change();
        });
    }
};
