<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lengkapi biodata siswa (Buku Induk) supaya sama detailnya dengan
 * formulir PPDB — field yang di PPDB ada tapi di Student belum, plus
 * data ayah/ibu dipecah granular (PPDB pisah ayah/ibu, Student lama
 * cuma punya 1 kolom gabungan "_ortu"). Kolom "_ortu" LAMA SENGAJA
 * tidak dihapus/diganti (masih dipakai di tempat lain), field baru ini
 * cuma tambahan supaya biodata siswa yang berasal dari PPDB (lihat
 * PpdbController::buatSiswaDariPendaftar()) bisa disalin lengkap tanpa
 * kehilangan detail ayah/ibu terpisah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // A. Keterangan Pribadi — pelengkap
            $table->string('no_registrasi_akta_lahir')->nullable()->after('nik');
            $table->string('kewarganegaraan')->nullable()->after('agama');
            $table->string('tempat_tinggal')->nullable()->after('alamat');

            // B. Pendidikan — pelengkap
            $table->string('tanggal_no_stk')->nullable()->after('ijazah_nomor');

            // C/D. Data Ayah & Ibu terpisah (selain kolom gabungan lama)
            $table->string('pekerjaan_ayah')->nullable()->after('nama_ayah');
            $table->string('penghasilan_ayah')->nullable()->after('pekerjaan_ayah');
            $table->string('alamat_ayah')->nullable()->after('penghasilan_ayah');
            $table->string('no_hp_ayah')->nullable()->after('alamat_ayah');
            $table->string('pekerjaan_ibu')->nullable()->after('nama_ibu');
            $table->string('penghasilan_ibu')->nullable()->after('pekerjaan_ibu');
            $table->string('alamat_ibu')->nullable()->after('penghasilan_ibu');
            $table->string('no_hp_ibu')->nullable()->after('alamat_ibu');

            // F. Data Periodik — pelengkap (tinggi/berat_badan sudah ada)
            $table->string('jarak_rumah_sekolah')->nullable()->after('berat_badan');
            $table->string('ukuran_baju')->nullable()->after('jarak_rumah_sekolah');
            $table->string('hobi')->nullable()->after('ukuran_baju');

            // G. Berkas Persyaratan Pendaftaran — berkas tambahan (selain
            // foto/ktp/cv/sertifikat yang sudah ada), disalin langsung dari
            // berkas PPDB kalau siswa berasal dari jalur PPDB.
            $table->string('berkas_ijazah')->nullable();
            $table->string('berkas_skhu')->nullable();
            $table->string('berkas_rapot')->nullable();
            $table->string('berkas_skkb')->nullable();
            $table->string('berkas_akta_lahir')->nullable();
            $table->string('berkas_kk')->nullable();
            $table->string('berkas_kip')->nullable();
            $table->string('berkas_formulir_pendaftaran')->nullable();
            $table->string('berkas_pernyataan')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'no_registrasi_akta_lahir', 'kewarganegaraan', 'tempat_tinggal', 'tanggal_no_stk',
                'pekerjaan_ayah', 'penghasilan_ayah', 'alamat_ayah', 'no_hp_ayah',
                'pekerjaan_ibu', 'penghasilan_ibu', 'alamat_ibu', 'no_hp_ibu',
                'jarak_rumah_sekolah', 'ukuran_baju', 'hobi',
                'berkas_ijazah', 'berkas_skhu', 'berkas_rapot', 'berkas_skkb',
                'berkas_akta_lahir', 'berkas_kk', 'berkas_kip',
                'berkas_formulir_pendaftaran', 'berkas_pernyataan',
            ]);
        });
    }
};
