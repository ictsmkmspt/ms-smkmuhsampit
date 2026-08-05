<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Lainnya" ditambahkan kembali sebagai jenis catch-all untuk agenda
     * yang tidak cocok masuk Semester/ASTS/ASAS (mis. MPLS, lomba, dst) —
     * "Kegiatan" TIDAK ikut dikembalikan, cuma "Lainnya" saja.
     */
    public function up(): void
    {
        Schema::table('academic_events', function (Blueprint $table) {
            $table->enum('jenis', ['semester_ganjil', 'semester_genap', 'asts', 'asas', 'lainnya'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('academic_events', function (Blueprint $table) {
            $table->enum('jenis', ['semester_ganjil', 'semester_genap', 'asts', 'asas'])->change();
        });
    }
};
