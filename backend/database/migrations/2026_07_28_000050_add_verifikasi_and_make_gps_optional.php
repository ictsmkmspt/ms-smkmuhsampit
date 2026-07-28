<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fitur radius GPS dihapus — absensi sekarang cukup klik tombol, tapi WAJIB
     * diverifikasi (paraf digital) oleh DUDI supaya sah, mengikuti alur jurnal
     * PKL kertas yang biasa dipakai sekolah. Kolom lokasi di tabel dudis dibuat
     * opsional (tidak dihapus, supaya tidak ada data yang hilang / migration
     * tidak destruktif) karena sudah tidak wajib diisi lagi.
     */
    public function up(): void
    {
        Schema::table('pkl_attendances', function (Blueprint $table) {
            $table->foreignId('verified_by')->nullable()->after('catatan_koreksi')->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable()->after('verified_by');
        });

        Schema::table('dudis', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->change();
            $table->decimal('longitude', 10, 7)->nullable()->change();
            $table->unsignedInteger('radius_meter')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pkl_attendances', function (Blueprint $table) {
            $table->dropConstrainedForeignId('verified_by');
            $table->dropColumn('verified_at');
        });

        Schema::table('dudis', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable(false)->change();
            $table->decimal('longitude', 10, 7)->nullable(false)->change();
            $table->unsignedInteger('radius_meter')->nullable(false)->default(100)->change();
        });
    }
};
