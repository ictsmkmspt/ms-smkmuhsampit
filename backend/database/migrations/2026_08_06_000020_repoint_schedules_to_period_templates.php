<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jadwal Pelajaran sekarang otomatis mengikuti Template Jadwal — tidak
     * ada lagi salinan baris jam per tahun ajaran ("periods") yang perlu
     * dimuat manual lewat tombol "Muat Template Default". schedules.period_id
     * dialihkan langsung ke period_templates, dan tabel periods dihapus
     * (sudah tidak dipakai sama sekali). Tabel schedules masih kosong di
     * produksi, jadi aman dialihkan langsung tanpa migrasi data.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['period_id']);
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->foreign('period_id')->references('id')->on('period_templates')->onDelete('cascade');
        });

        Schema::dropIfExists('periods');
    }

    public function down(): void
    {
        Schema::create('periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tahun_ajaran_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('hari', ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']);
            $table->string('jam_ke', 10)->nullable();
            $table->time('waktu_mulai');
            $table->time('waktu_selesai');
            $table->enum('tipe', ['pelajaran', 'khusus']);
            $table->string('label_khusus')->nullable();
            $table->string('warna', 7)->nullable();
            $table->timestamps();
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['period_id']);
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->foreign('period_id')->references('id')->on('periods')->onDelete('cascade');
        });
    }
};
