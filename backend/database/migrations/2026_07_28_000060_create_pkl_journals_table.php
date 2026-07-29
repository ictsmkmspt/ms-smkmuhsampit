<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jurnal Kegiatan PKL — beda dari pkl_attendances (yang soal jam masuk/pulang).
     * Ini soal apa yang dikerjakan siswa hari itu ("Kegiatan", diisi siswa) dan
     * tanggapan instruktur DUDI ("Catatan", diisi DUDI), mengikuti format jurnal
     * kegiatan PKL kertas yang biasa dipakai sekolah.
     */
    public function up(): void
    {
        Schema::create('pkl_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pkl_placement_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->text('kegiatan');
            $table->text('catatan')->nullable();
            $table->foreignId('catatan_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('catatan_at')->nullable();
            $table->timestamps();

            $table->unique(['pkl_placement_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pkl_journals');
    }
};
