<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Soal & pilihan jawaban sekarang bisa isi HTML kaya (bold/italic/list/
    // tabel/gambar base64/superscript-subscript dari editor TipTap), bukan
    // cuma teks polos — pilihan_a-d yang tadinya VARCHAR(255) dinaikkan ke
    // LONGTEXT (gambar base64 gampang melebihi 255 karakter). pertanyaan
    // yang tadinya TEXT (batas ~64KB) juga dinaikkan ke LONGTEXT untuk
    // alasan sama. Tambah audio_path buat soal listening (1 file per soal).
    public function up(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->longText('pertanyaan')->change();
            $table->longText('pilihan_a')->change();
            $table->longText('pilihan_b')->change();
            $table->longText('pilihan_c')->change();
            $table->longText('pilihan_d')->change();
            $table->string('audio_path')->nullable()->after('jawaban_benar');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->dropColumn('audio_path');
            $table->text('pertanyaan')->change();
            $table->string('pilihan_a')->change();
            $table->string('pilihan_b')->change();
            $table->string('pilihan_c')->change();
            $table->string('pilihan_d')->change();
        });
    }
};
