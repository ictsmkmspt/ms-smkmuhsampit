<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PpdbPendaftar extends Model
{
    protected $table = 'ppdb_pendaftars';

    protected $fillable = [
        'kode_pendaftaran', 'nama_lengkap', 'nik', 'nisn', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
        'no_registrasi_akta_lahir', 'agama', 'kewarganegaraan', 'berkebutuhan_khusus',
        'alamat', 'tempat_tinggal', 'anak_ke', 'jumlah_saudara', 'no_hp_siswa',
        'asal_sekolah', 'ijazah_terakhir', 'tanggal_no_stk',
        'nama_orang_tua', 'no_hp_orang_tua',
        'nama_ayah', 'pekerjaan_ayah', 'penghasilan_ayah', 'alamat_ayah', 'no_hp_ayah',
        'nama_ibu', 'pekerjaan_ibu', 'penghasilan_ibu', 'alamat_ibu', 'no_hp_ibu',
        'nama_wali', 'alamat_wali',
        'jurusan_pilihan', 'tinggi_badan', 'jarak_rumah_sekolah', 'berat_badan', 'ukuran_baju', 'hobi',
        'status', 'catatan', 'student_id', 'ppdb_periode_id',
        'berkas_ijazah', 'berkas_skhu', 'berkas_rapot', 'berkas_skkb', 'berkas_pas_foto', 'berkas_formulir_pendaftaran',
        'berkas_pernyataan', 'berkas_akta_lahir', 'berkas_kk', 'berkas_kip', 'bukti_pembayaran',
    ];

    protected $appends = [
        'berkas_ijazah_url', 'berkas_skhu_url', 'berkas_rapot_url', 'berkas_skkb_url', 'berkas_pas_foto_url',
        'berkas_formulir_pendaftaran_url',
        'berkas_pernyataan_url', 'berkas_akta_lahir_url', 'berkas_kk_url', 'berkas_kip_url',
        'bukti_pembayaran_url',
        'biodata_lengkap', 'target_biaya',
    ];

    /**
     * Pendaftar baru otomatis ditandai masuk periode PPDB yang sedang aktif
     * kalau tidak diisi eksplisit — pola sama seperti TagihanLain::booted()
     * buat tahun_ajaran_id, supaya daftar()/storeManual()/updateByKode()
     * tidak perlu tahu apa-apa soal periode sama sekali.
     */
    protected static function booted(): void
    {
        static::creating(function (PpdbPendaftar $pendaftar) {
            if (!$pendaftar->ppdb_periode_id) {
                $pendaftar->ppdb_periode_id = PpdbPeriode::aktifId();
            }
        });
    }

    /**
     * Field biodata yang wajib diisi kalau daftar lewat formulir ONLINE
     * (lihat PpdbController::aturanValidasiPpdb()) — dipakai lagi di sini
     * untuk kolom "Kelengkapan Biodata" di tabel admin, supaya pendaftar
     * OFFLINE (yang cuma wajib isi nama & jurusan) kelihatan jelas kalau
     * datanya masih perlu dilengkapi. Data Wali, Berkebutuhan Khusus, No.
     * Registrasi Akta Lahir & Tanggal/No. STK SENGAJA tidak dicek (semuanya
     * inheren opsional, bukan berarti "kurang lengkap" kalau kosong).
     */
    public const FIELD_WAJIB_ONLINE = [
        'nik', 'nisn', 'tempat_lahir', 'tanggal_lahir', 'agama', 'kewarganegaraan',
        'alamat', 'tempat_tinggal', 'anak_ke', 'jumlah_saudara', 'no_hp_siswa',
        'asal_sekolah', 'ijazah_terakhir',
        'nama_ayah', 'pekerjaan_ayah', 'penghasilan_ayah', 'alamat_ayah', 'no_hp_ayah',
        'nama_ibu', 'pekerjaan_ibu', 'penghasilan_ibu', 'alamat_ibu', 'no_hp_ibu',
        'jurusan_pilihan', 'tinggi_badan', 'jarak_rumah_sekolah', 'berat_badan', 'ukuran_baju', 'hobi',
    ];

    public function getBiodataLengkapAttribute(): bool
    {
        foreach (self::FIELD_WAJIB_ONLINE as $field) {
            if ($this->{$field} === null || $this->{$field} === '') {
                return false;
            }
        }
        return true;
    }

    // Path relatif ('/storage/...'), BUKAN asset() — asset() menghasilkan URL
    // absolut ke host backend (mis. http://127.0.0.1:8000/...) yang cuma
    // bisa diakses dari mesin server itu sendiri, rusak diakses dari
    // device/browser lain. Path relatif diselesaikan oleh origin frontend
    // sendiri (lewat proxy /storage di vite.config.js), pola yang sama
    // dipakai Student::getFotoUrlAttribute() dkk di seluruh aplikasi ini.
    public function getBerkasIjazahUrlAttribute() { return $this->berkas_ijazah ? '/storage/' . $this->berkas_ijazah : null; }
    public function getBerkasSkhuUrlAttribute() { return $this->berkas_skhu ? '/storage/' . $this->berkas_skhu : null; }
    public function getBerkasRapotUrlAttribute() { return $this->berkas_rapot ? '/storage/' . $this->berkas_rapot : null; }
    public function getBerkasSkkbUrlAttribute() { return $this->berkas_skkb ? '/storage/' . $this->berkas_skkb : null; }
    public function getBerkasPasFotoUrlAttribute() { return $this->berkas_pas_foto ? '/storage/' . $this->berkas_pas_foto : null; }
    public function getBerkasFormulirPendaftaranUrlAttribute() { return $this->berkas_formulir_pendaftaran ? '/storage/' . $this->berkas_formulir_pendaftaran : null; }
    public function getBerkasPernyataanUrlAttribute() { return $this->berkas_pernyataan ? '/storage/' . $this->berkas_pernyataan : null; }
    public function getBerkasAktaLahirUrlAttribute() { return $this->berkas_akta_lahir ? '/storage/' . $this->berkas_akta_lahir : null; }
    public function getBerkasKkUrlAttribute() { return $this->berkas_kk ? '/storage/' . $this->berkas_kk : null; }
    public function getBerkasKipUrlAttribute() { return $this->berkas_kip ? '/storage/' . $this->berkas_kip : null; }
    public function getBuktiPembayaranUrlAttribute() { return $this->bukti_pembayaran ? '/storage/' . $this->bukti_pembayaran : null; }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function pembayarans()
    {
        return $this->hasMany(PpdbPembayaran::class, 'ppdb_pendaftar_id')->orderByDesc('tanggal_bayar')->orderByDesc('id');
    }

    public function ppdbPeriode()
    {
        return $this->belongsTo(PpdbPeriode::class, 'ppdb_periode_id');
    }

    /**
     * Nominal biaya pendaftaran yang berlaku buat pendaftar ini, dibedakan
     * lewat jenis_kelamin — diambil dari periode PPDB-nya (lihat
     * PpdbPeriode::targetBiaya()). Pendaftar lama dari SEBELUM fitur
     * periode ada (ppdb_periode_id kosong) jatuh ke Setting global lama
     * (ppdb_biaya_nominal_l/_p) sebagai fallback, supaya datanya tidak
     * tiba-tiba kehilangan target biaya.
     */
    public function getTargetBiayaAttribute(): int
    {
        if ($this->ppdbPeriode) {
            return $this->ppdbPeriode->targetBiaya($this->jenis_kelamin);
        }

        return (int) Setting::get(
            $this->jenis_kelamin === 'P' ? 'ppdb_biaya_nominal_p' : 'ppdb_biaya_nominal_l',
            '0'
        );
    }

    /**
     * Kode unik untuk pendaftar cek status pendaftarannya sendiri tanpa
     * perlu akun login (PPDB dibuka untuk calon siswa yang belum punya akun
     * sama sekali di sistem).
     */
    public static function buatKodePendaftaran(): string
    {
        do {
            $kode = 'PPDB-' . now()->format('y') . '-' . Str::upper(Str::random(6));
        } while (static::where('kode_pendaftaran', $kode)->exists());

        return $kode;
    }
}
