<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PpdbPeriode extends Model
{
    protected $table = 'ppdb_periodes';

    protected $fillable = ['nama', 'status', 'tanggal_mulai', 'tanggal_selesai', 'biaya_nominal_l', 'biaya_nominal_p'];

    public function pendaftars()
    {
        return $this->hasMany(PpdbPendaftar::class, 'ppdb_periode_id');
    }

    /**
     * ID periode PPDB yang sedang aktif — dipakai PpdbPendaftar buat
     * otomatis menandai pendaftar baru masuk periode mana, tanpa daftar()/
     * storeManual() perlu diisi manual. Pola sama seperti TahunAjaran::
     * aktifId(), tapi sengaja independen (lihat komentar migrasinya).
     */
    public static function aktifId(): ?int
    {
        return static::where('status', 'aktif')->value('id');
    }

    public function targetBiaya(string $jenisKelamin): int
    {
        return (int) ($jenisKelamin === 'P' ? $this->biaya_nominal_p : $this->biaya_nominal_l);
    }
}
