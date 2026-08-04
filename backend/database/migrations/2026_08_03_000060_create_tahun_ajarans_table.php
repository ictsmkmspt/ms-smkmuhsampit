<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tahun_ajarans', function (Blueprint $table) {
            $table->id();
            $table->string('nama'); // contoh: "2026/2027"
            $table->enum('status', ['aktif', 'nonaktif'])->default('nonaktif');
            $table->timestamps();
        });

        // Tahun ajaran aktif pertama, supaya sistem langsung punya acuan
        // tanpa admin wajib bikin dulu — nama ditebak dari tanggal migrasi
        // dijalankan (tahun ajaran di Indonesia mulai bulan Juli).
        $bulan = (int) now()->format('n');
        $tahunMulai = $bulan >= 7 ? (int) now()->format('Y') : (int) now()->format('Y') - 1;

        DB::table('tahun_ajarans')->insert([
            'nama' => $tahunMulai . '/' . ($tahunMulai + 1),
            'status' => 'aktif',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tahun_ajarans');
    }
};
