<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppdb_pembayarans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ppdb_pendaftar_id')->constrained('ppdb_pendaftars')->cascadeOnDelete();
            $table->unsignedBigInteger('nominal');
            $table->enum('metode', ['tunai', 'transfer'])->default('tunai');
            $table->date('tanggal_bayar');
            $table->string('catatan')->nullable();
            $table->foreignId('dicatat_oleh_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppdb_pembayarans');
    }
};
