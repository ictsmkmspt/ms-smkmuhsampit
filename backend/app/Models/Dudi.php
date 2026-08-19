<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dudi extends Model
{
    protected $fillable = [
        'user_id', 'nama_perusahaan', 'alamat', 'penanggung_jawab',
        'telepon', 'latitude', 'longitude', 'radius_meter', 'tanda_tangan',
    ];

    protected $appends = ['tanda_tangan_url'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * URL relatif gambar tanda tangan (null kalau DUDI belum pernah unggah).
     * Sengaja relatif (bukan URL lengkap ke backend) supaya lewat proxy HTTPS
     * Vite yang sama dengan /api — tidak diblokir browser karena mixed-content.
     */
    public function getTandaTanganUrlAttribute(): ?string
    {
        return $this->tanda_tangan ? '/storage/' . $this->tanda_tangan : null;
    }

    /**
     * Hitung jarak (meter) dari koordinat DUDI ini ke 1 titik koordinat lain,
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
     * True kalau 1 titik koordinat berada dalam radius yang diizinkan DUDI ini.
     */
    public function dalamRadius(float $lat, float $lng): bool
    {
        return $this->jarakKe($lat, $lng) <= $this->radius_meter;
    }
}
