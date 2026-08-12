<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Papan pengumuman — semua guru boleh membuat, siswa & orang tua/wali
 * cuma boleh membaca. Sengaja tidak diikat tahun ajaran (pengumuman
 * bersifat umum, bukan data akademik per tahun).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('judul');
            $table->text('isi');
            // nullable + nullOnDelete (bukan cascade) — sama seperti
            // recorded_by/diproses_oleh di fitur lain: kalau akun gurunya
            // suatu saat dihapus, pengumumannya tetap ada (arsip), cuma
            // penulisnya jadi tidak diketahui.
            $table->foreignId('dibuat_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
