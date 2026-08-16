<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catatan kunjungan Laboratorium — sama seperti perpustakaan_kunjungan,
     * ditambah room_id supaya kunjungan tercatat ke ruang lab yang mana
     * (dicatat oleh Kepala Bengkel yang ditugaskan ke ruang itu).
     */
    public function up(): void
    {
        Schema::create('laboratorium_kunjungan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->string('pengunjung_type');
            $table->unsignedBigInteger('pengunjung_id');
            $table->string('keperluan', 100);
            $table->date('tanggal');
            $table->foreignId('dicatat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['pengunjung_type', 'pengunjung_id']);
            $table->index(['room_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('laboratorium_kunjungan');
    }
};
