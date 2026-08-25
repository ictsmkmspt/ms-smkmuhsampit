<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * IDUKA sekarang bisa daftar mandiri (bukan cuma dibuat admin) lewat
 * IdukaController::registerPublic() — butuh status persetujuan BKK
 * sebelum bisa login. Default 'aktif' supaya SEMUA baris lama + IDUKA
 * yang dibuat admin lewat store() otomatis tetap bisa login tanpa ubah
 * kode itu sama sekali; cuma pendaftaran mandiri yang eksplisit
 * di-set 'menunggu'.
 *
 * latitude/longitude/radius_meter dibuat nullable karena pendaftar
 * mandiri belum isi lokasi GPS PKL (diisi BKK/admin belakangan kalau
 * perlu) — PklAttendanceController sudah null-safe untuk field ini.
 * Dipakai ALTER TABLE mentah (bukan Blueprint::change()) karena
 * doctrine/dbal tidak terpasang di proyek ini.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE idukas ADD COLUMN status ENUM('menunggu','aktif','ditolak') NOT NULL DEFAULT 'aktif' AFTER user_id");
            DB::statement('ALTER TABLE idukas MODIFY latitude DECIMAL(10,7) NULL');
            DB::statement('ALTER TABLE idukas MODIFY longitude DECIMAL(10,7) NULL');
            DB::statement('ALTER TABLE idukas MODIFY radius_meter INT UNSIGNED NULL');
        } else {
            Schema::table('idukas', function (Blueprint $table) {
                $table->string('status')->default('aktif')->after('user_id');
            });
        }

        Schema::table('idukas', function (Blueprint $table) {
            $table->string('catatan_verifikasi')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('idukas', function (Blueprint $table) {
            $table->dropColumn(['status', 'catatan_verifikasi']);
        });
    }
};
