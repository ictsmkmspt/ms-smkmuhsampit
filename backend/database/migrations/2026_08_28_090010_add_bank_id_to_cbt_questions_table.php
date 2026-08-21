<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nullable (bukan wajib di level DB) supaya soal lama sebelum fitur "Bank
 * Soal bernama" ini tetap valid (tampil sebagai "Belum dikelompokkan" di
 * frontend) — kewajiban isi bank_id untuk soal BARU cukup dijaga di
 * validasi controller, sama pola seperti cbt_materi.tp_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->foreignId('bank_id')->nullable()->after('subject_id')->constrained('cbt_bank_soal')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bank_id');
        });
    }
};
