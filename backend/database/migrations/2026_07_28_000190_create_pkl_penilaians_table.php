<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penilaian PKL oleh IDUKA — 5 aspek tetap (skornya langsung jadi kolom,
     * karena namanya selalu sama) + kompetensi teknis yang jumlah & namanya
     * bebas ditentukan IDUKA (disimpan di tabel terpisah pkl_penilaian_kompetensis).
     * Sekali submit bersifat final — makanya tidak ada kolom status draft,
     * begitu ada baris di sini artinya sudah final.
     */
    public function up(): void
    {
        Schema::create('pkl_penilaians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pkl_placement_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('skor_disiplin');
            $table->unsignedTinyInteger('skor_sikap');
            $table->unsignedTinyInteger('skor_komunikasi');
            $table->unsignedTinyInteger('skor_inisiatif');
            $table->unsignedTinyInteger('skor_k3');
            $table->text('catatan')->nullable();
            $table->decimal('nilai_akhir', 5, 2);
            $table->foreignId('submitted_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('pkl_penilaian_kompetensis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pkl_penilaian_id')->constrained()->cascadeOnDelete();
            $table->string('nama_kompetensi');
            $table->unsignedTinyInteger('skor');
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pkl_penilaian_kompetensis');
        Schema::dropIfExists('pkl_penilaians');
    }
};
