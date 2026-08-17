<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom profil tambahan untuk Kartu Pelajar & data siswa yang lebih
     * lengkap — semuanya OPSIONAL (nullable), tidak wajib diisi supaya data
     * siswa yang sudah ada tidak perlu dilengkapi paksa. jurusan_id
     * di-set-null kalau jurusannya dihapus dari Pengaturan (bukan ikut
     * terhapus siswanya), sama seperti pola class_room_id.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->foreignId('jurusan_id')->nullable()->after('class_room_id')->constrained('jurusans')->nullOnDelete();
            $table->string('foto')->nullable()->after('qr_code');
            $table->string('tempat_lahir')->nullable()->after('foto');
            $table->date('tanggal_lahir')->nullable()->after('tempat_lahir');
            $table->string('alamat', 300)->nullable()->after('tanggal_lahir');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropConstrainedForeignId('jurusan_id');
            $table->dropColumn(['foto', 'tempat_lahir', 'tanggal_lahir', 'alamat']);
        });
    }
};
