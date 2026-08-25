<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Iduka extends Model
{
    // 'user_id' SENGAJA tidak di $fillable — dikelola eksplisit lewat
    // IdukaController (bukan mass-assignment), lihat user() di bawah.
    protected $fillable = [
        'nama_perusahaan', 'jenis_kerjasama', 'alamat',
        'telepon', 'latitude', 'longitude', 'radius_meter', 'tanda_tangan', 'dokumen_mou',
        'status', 'catatan_verifikasi',
    ];

    protected $appends = ['tanda_tangan_url', 'dokumen_mou_url'];

    /**
     * Akun Instruktur yang mewakili perusahaan ini (bisa lebih dari 1).
     * Dipakai buat cetak jurnal/nilai PKL supaya masih bisa tampilkan nama
     * "instruktur" walau field penanggung_jawab sudah tidak ada di sini lagi.
     */
    public function instrukturs()
    {
        return $this->hasMany(User::class, 'iduka_id')->where('role', 'instruktur');
    }

    /**
     * Akun login milik perusahaan ini SENDIRI (role 'iduka', beda dari
     * akun Instruktur). Baris "Kelola IDUKA" ini LANGSUNG jadi akun login-nya
     * — bukan menu/tabel akun terpisah — jadi paling banyak 1 akun per
     * perusahaan, dibuat/diedit lewat form yang sama di IdukaController.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function jobVacancies()
    {
        return $this->hasMany(JobVacancy::class);
    }

    /**
     * URL relatif gambar tanda tangan (null kalau IDUKA belum pernah unggah).
     * Sengaja relatif (bukan URL lengkap ke backend) supaya lewat proxy HTTPS
     * Vite yang sama dengan /api — tidak diblokir browser karena mixed-content.
     */
    public function getTandaTanganUrlAttribute(): ?string
    {
        return $this->tanda_tangan ? '/storage/' . $this->tanda_tangan : null;
    }

    public function getDokumenMouUrlAttribute(): ?string
    {
        return $this->dokumen_mou ? '/storage/' . $this->dokumen_mou : null;
    }

    /**
     * Hitung jarak (meter) dari koordinat IDUKA ini ke 1 titik koordinat lain,
     * pakai rumus Haversine (jarak garis lurus di permukaan bumi, mengikuti
     * lengkungan bumi — cukup akurat untuk jarak pendek seperti radius lokasi).
     */
    public function jarakKe(float $lat, float $lng): int
    {
        $bumiMeter = 6371000;

        $lat1 = deg2rad((float) $this->latitude);
        $lat2 = deg2rad($lat);
        $deltaLat = deg2rad($lat - (float) $this->latitude);
        $deltaLng = deg2rad($lng - (float) $this->longitude);

        $a = sin($deltaLat / 2) ** 2
            + cos($lat1) * cos($lat2) * sin($deltaLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return (int) round($bumiMeter * $c);
    }

    /**
     * True kalau 1 titik koordinat berada dalam radius yang diizinkan IDUKA ini.
     */
    public function dalamRadius(float $lat, float $lng): bool
    {
        return $this->jarakKe($lat, $lng) <= $this->radius_meter;
    }
}
