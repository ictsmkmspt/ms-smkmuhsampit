<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bobot angka bebas (1-100) diganti jadi 3 pilihan tingkat kesulitan
 * (mudah/sedang/sulit) supaya guru tidak perlu mikir angka spesifik —
 * skor tetap dihitung proporsional seperti sebelumnya, cuma sumber
 * bobotnya sekarang dipetakan tetap dari tingkat kesulitan (lihat
 * CbtQuestion::BOBOT_MAP & accessor bobot()). Soal essay TIDAK ikut
 * dipangkas resolusi nilainya — tetap dikoreksi 0-100 lalu dinormalisasi
 * ke bobot level soalnya saat hitung skor total (lihat HitungSkorCbt).
 *
 * Data lama dikonversi otomatis dari bobot 1-100 sebelumnya:
 * 1-33 -> mudah, 34-66 -> sedang, 67-100 -> sulit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->string('tingkat_kesulitan', 10)->default('sedang')->after('bobot');
        });

        DB::table('cbt_questions')->where('bobot', '<=', 33)->update(['tingkat_kesulitan' => 'mudah']);
        DB::table('cbt_questions')->whereBetween('bobot', [34, 66])->update(['tingkat_kesulitan' => 'sedang']);
        DB::table('cbt_questions')->where('bobot', '>=', 67)->update(['tingkat_kesulitan' => 'sulit']);

        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->dropColumn('bobot');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->unsignedInteger('bobot')->default(10)->after('jawaban_benar');
        });

        DB::table('cbt_questions')->where('tingkat_kesulitan', 'mudah')->update(['bobot' => 20]);
        DB::table('cbt_questions')->where('tingkat_kesulitan', 'sedang')->update(['bobot' => 50]);
        DB::table('cbt_questions')->where('tingkat_kesulitan', 'sulit')->update(['bobot' => 80]);

        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->dropColumn('tingkat_kesulitan');
        });
    }
};
