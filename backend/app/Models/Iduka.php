<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Iduka extends Model
{
    // 'user_id' SENGAJA tidak lagi di sini — perusahaan mitra sekarang data
    // master lepas, tidak terikat 1:1 ke 1 akun login (lihat User::iduka()).
    protected $fillable = [
        'nama_perusahaan', 'alamat',
        'telepon', 'latitude', 'longitude', 'radius_meter', 'tanda_tangan',
    ];

    protected $appends = ['tanda_tangan_url'];

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
     * URL relatif gambar tanda tangan (null kalau IDUKA belum pernah unggah).
     * Sengaja relatif (bukan URL lengkap ke backend) supaya lewat proxy HTTPS
     * Vite yang sama dengan /api — tidak diblokir browser karena mixed-content.
     */
    public function getTandaTanganUrlAttribute(): ?string
    {
        return $this->tanda_tangan ? '/storage/' . $this->tanda_tangan : null;
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
