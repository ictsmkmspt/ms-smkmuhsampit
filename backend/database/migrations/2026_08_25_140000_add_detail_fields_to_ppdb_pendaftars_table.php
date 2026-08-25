<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lengkapi formulir PPDB online supaya setara formulir kertas sekolah
 * (Keterangan Pribadi, Pendidikan, Data Ayah/Ibu/Wali, Data Prodi Siswa)
 * + berkas persyaratan yang wajib dilampirkan. Field lama (nama_orang_tua,
 * no_hp_orang_tua) SENGAJA dipertahankan (bukan dihapus) — masih dipakai
 * form "Tambah Pendaftar Offline" admin & kolom tabel yang sudah ada,
 * supaya tidak ada breaking change di sana.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            // A. Keterangan Pribadi (tambahan)
            $table->string('nik', 20)->nullable()->after('nama_lengkap');
            $table->string('no_registrasi_akta_lahir')->nullable()->after('tanggal_lahir');
            $table->string('agama')->nullable()->after('no_registrasi_akta_lahir');
            $table->string('kewarganegaraan')->nullable()->after('agama');
            $table->string('berkebutuhan_khusus')->nullable()->after('kewarganegaraan');
            $table->string('tempat_tinggal')->nullable()->after('alamat');
            $table->integer('anak_ke')->nullable()->after('tempat_tinggal');
            $table->integer('jumlah_saudara')->nullable()->after('anak_ke');
            $table->string('no_hp_siswa')->nullable()->after('jumlah_saudara');

            // B. Pendidikan (tambahan)
            $table->string('ijazah_terakhir')->nullable()->after('asal_sekolah');
            $table->string('tanggal_no_stk')->nullable()->after('ijazah_terakhir');

            // C/D. Data Ayah & Ibu Kandung (pengganti nama_orang_tua tunggal, lebih rinci)
            $table->string('nama_ayah')->nullable()->after('tanggal_no_stk');
            $table->string('pekerjaan_ayah')->nullable()->after('nama_ayah');
            $table->string('penghasilan_ayah')->nullable()->after('pekerjaan_ayah');
            $table->string('alamat_ayah')->nullable()->after('penghasilan_ayah');
            $table->string('no_hp_ayah')->nullable()->after('alamat_ayah');
            $table->string('nama_ibu')->nullable()->after('no_hp_ayah');
            $table->string('pekerjaan_ibu')->nullable()->after('nama_ibu');
            $table->string('penghasilan_ibu')->nullable()->after('pekerjaan_ibu');
            $table->string('alamat_ibu')->nullable()->after('penghasilan_ibu');
            $table->string('no_hp_ibu')->nullable()->after('alamat_ibu');

            // E. Data Wali
            $table->string('nama_wali')->nullable()->after('no_hp_ibu');
            $table->string('alamat_wali')->nullable()->after('nama_wali');

            // F. Data Prodi Siswa
            $table->integer('tinggi_badan')->nullable()->after('jurusan_pilihan');
            $table->string('jarak_rumah_sekolah')->nullable()->after('tinggi_badan');
            $table->integer('berat_badan')->nullable()->after('jarak_rumah_sekolah');
            $table->string('ukuran_baju')->nullable()->after('berat_badan');
            $table->string('hobi')->nullable()->after('ukuran_baju');

            // G. Berkas persyaratan (path file, disk public)
            $table->string('berkas_ijazah')->nullable()->after('catatan');
            $table->string('berkas_skhu')->nullable()->after('berkas_ijazah');
            $table->string('berkas_rapot')->nullable()->after('berkas_skhu');
            $table->string('berkas_skkb')->nullable()->after('berkas_rapot');
            $table->string('berkas_pas_foto')->nullable()->after('berkas_skkb');
            $table->string('berkas_pernyataan')->nullable()->after('berkas_pas_foto');
            $table->string('berkas_akta_lahir')->nullable()->after('berkas_pernyataan');
            $table->string('berkas_kk')->nullable()->after('berkas_akta_lahir');
            $table->string('berkas_kip')->nullable()->after('berkas_kk');
        });
    }

    public function down(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->dropColumn([
                'nik', 'no_registrasi_akta_lahir', 'agama', 'kewarganegaraan', 'berkebutuhan_khusus',
                'tempat_tinggal', 'anak_ke', 'jumlah_saudara', 'no_hp_siswa',
                'ijazah_terakhir', 'tanggal_no_stk',
                'nama_ayah', 'pekerjaan_ayah', 'penghasilan_ayah', 'alamat_ayah', 'no_hp_ayah',
                'nama_ibu', 'pekerjaan_ibu', 'penghasilan_ibu', 'alamat_ibu', 'no_hp_ibu',
                'nama_wali', 'alamat_wali',
                'tinggi_badan', 'jarak_rumah_sekolah', 'berat_badan', 'ukuran_baju', 'hobi',
                'berkas_ijazah', 'berkas_skhu', 'berkas_rapot', 'berkas_skkb', 'berkas_pas_foto',
                'berkas_pernyataan', 'berkas_akta_lahir', 'berkas_kk', 'berkas_kip',
            ]);
        });
    }
};
