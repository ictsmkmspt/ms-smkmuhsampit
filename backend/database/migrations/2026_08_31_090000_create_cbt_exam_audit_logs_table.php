<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak audit untuk aksi berisiko pada ujian yang SUDAH ADA siswa yang
 * mengerjakan — Edit/Hapus/Buka Kembali sekarang sengaja tetap boleh
 * dilakukan meski sudah ada attempt (lihat CbtExamController), jadi butuh
 * pencatatan siapa+kapan sebagai pengaman. exam_id SENGAJA tanpa foreign
 * key (bukan nullOnDelete) — baris log ini harus tetap ada & terbaca utuh
 * walau ujiannya sendiri sudah dihapus permanen, makanya nama_ujian juga
 * disalin (snapshot) supaya tidak bergantung ke tabel cbt_exams lagi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cbt_exam_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('exam_id');
            $table->string('nama_ujian', 150);
            $table->enum('aksi', ['diubah', 'dihapus', 'dibuka_kembali']);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('actor_nama', 100);
            $table->string('actor_role', 30);
            $table->unsignedInteger('attempts_count_saat_itu')->default(0);
            $table->timestamps();
            $table->index('exam_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cbt_exam_audit_logs');
    }
};
