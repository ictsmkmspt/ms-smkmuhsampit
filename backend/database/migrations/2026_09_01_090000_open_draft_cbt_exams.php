<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tahap "draf" + tombol Terbitkan dihapus — ujian/latihan sekarang selalu
 * langsung dibuat berstatus "terbuka" (untuk ujian, jadwal_mulai/
 * jadwal_selesai sendiri yang membatasi kapan bisa dikerjakan siswa,
 * lihat CbtExam::isOpenForAttempt()). Migrasi data 1x ini membuka ujian
 * lama yang masih nyangkut di status "draft" dari sebelum perubahan ini,
 * supaya tidak macet permanen tanpa tombol Terbitkan lagi.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('cbt_exams')->where('status', 'draft')->update(['status' => 'terbuka']);
    }

    public function down(): void
    {
        // Data-fix satu arah — tidak ada cara mengetahui baris mana yang
        // dulunya "draft" untuk dikembalikan.
    }
};
