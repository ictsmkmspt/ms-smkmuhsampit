<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catatan "siswa X masuk tahap sanksi Y pada tanggal Z" — dibuat
     * otomatis oleh Student::tambahPoin() begitu total_poin siswa melewati
     * ambang batas sebuah SanksiRule (bukan cuma dihitung ulang tiap kali
     * dilihat seperti SanksiRuleController::siswa(), tapi benar-benar
     * tersimpan supaya BK punya daftar tugas & riwayat yang persisten).
     */
    public function up(): void
    {
        Schema::create('sanksi_kejadian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sanksi_rule_id')->nullable()->constrained('sanksi_rules')->nullOnDelete();
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('total_poin_saat_itu');
            $table->enum('status', ['diproses', 'selesai'])->default('diproses');
            $table->text('catatan_penyelesaian')->nullable();
            $table->foreignId('diproses_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('selesai_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanksi_kejadian');
    }
};
