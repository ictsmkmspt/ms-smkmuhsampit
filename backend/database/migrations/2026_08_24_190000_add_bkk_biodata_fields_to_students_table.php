<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Field tambahan khusus kebutuhan BKK (pencari kerja) — dicek lengkap-
 * tidaknya lewat Student::getBiodataLengkapAttribute() sebelum alumni
 * boleh melamar lowongan (lihat JobApplicationController::store()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->unsignedSmallInteger('tinggi_badan')->nullable()->after('jenis_kelamin');
            $table->unsignedSmallInteger('berat_badan')->nullable()->after('tinggi_badan');
            $table->enum('status_pernikahan', ['belum_menikah', 'menikah'])->nullable()->after('berat_badan');
            $table->text('keahlian')->nullable()->after('status_pernikahan');
            $table->text('pengalaman_kerja')->nullable()->after('keahlian');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['tinggi_badan', 'berat_badan', 'status_pernikahan', 'keahlian', 'pengalaman_kerja']);
        });
    }
};
