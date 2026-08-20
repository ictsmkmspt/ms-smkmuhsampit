<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Field tambahan biodata lengkap siswa, mengikuti format resmi
    // "Keterangan Tentang Diri Siswa" di Buku Induk kertas sekolah — dulu
    // cuma field inti (nama/NIS/NISN/kelas/dll) yang tersimpan, sisanya
    // (NIK, agama, sekolah asal, ijazah, orang tua/wali) masih di kertas
    // saja. Kompetensi Keahlian & Kelas TIDAK didobel di sini — itu tetap
    // pakai jurusan_id/class_room_id yang sudah ada (nilai LIVE, bukan
    // snapshot saat diterima).
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('nik', 20)->nullable()->after('nisn');
            $table->string('agama', 30)->nullable()->after('jenis_kelamin');
            $table->string('kebutuhan_khusus')->nullable()->after('alamat');
            $table->unsignedTinyInteger('jumlah_saudara')->nullable()->after('kebutuhan_khusus');
            $table->unsignedTinyInteger('anak_ke')->nullable()->after('jumlah_saudara');
            $table->string('no_telp', 30)->nullable()->after('anak_ke');

            $table->string('sekolah_asal_nama')->nullable()->after('no_telp');
            $table->string('sekolah_asal_alamat')->nullable()->after('sekolah_asal_nama');
            $table->string('ijazah_tahun', 20)->nullable()->after('sekolah_asal_alamat');
            $table->string('ijazah_nomor', 100)->nullable()->after('ijazah_tahun');

            $table->string('tingkat_diterima', 10)->nullable()->after('ijazah_nomor');
            $table->date('tanggal_diterima')->nullable()->after('tingkat_diterima');

            $table->string('nama_ayah')->nullable()->after('tanggal_diterima');
            $table->string('nama_ibu')->nullable()->after('nama_ayah');
            $table->string('alamat_ortu')->nullable()->after('nama_ibu');
            $table->string('telp_ortu', 60)->nullable()->after('alamat_ortu');
            $table->string('pekerjaan_ortu')->nullable()->after('telp_ortu');
            $table->string('penghasilan_ortu', 60)->nullable()->after('pekerjaan_ortu');

            $table->string('nama_wali')->nullable()->after('penghasilan_ortu');
            $table->string('alamat_wali')->nullable()->after('nama_wali');
            $table->string('telp_wali', 60)->nullable()->after('alamat_wali');
            $table->string('pekerjaan_wali')->nullable()->after('telp_wali');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'nik', 'agama', 'kebutuhan_khusus', 'jumlah_saudara', 'anak_ke', 'no_telp',
                'sekolah_asal_nama', 'sekolah_asal_alamat', 'ijazah_tahun', 'ijazah_nomor',
                'tingkat_diterima', 'tanggal_diterima',
                'nama_ayah', 'nama_ibu', 'alamat_ortu', 'telp_ortu', 'pekerjaan_ortu', 'penghasilan_ortu',
                'nama_wali', 'alamat_wali', 'telp_wali', 'pekerjaan_wali',
            ]);
        });
    }
};
