<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Jadwal Monitoring PKL — GLOBAL, dibuat admin/waka_kurikulum, berlaku
 * untuk semua guru sekaligus (bukan per siswa/per IDUKA/per guru).
 */
class PklMonitoringJadwal extends Model
{
    protected $fillable = ['tahun_ajaran_id', 'judul', 'tanggal_rencana', 'tanggal_selesai', 'catatan', 'dibuat_oleh'];

    protected static function booted(): void
    {
        static::creating(function (PklMonitoringJadwal $jadwal) {
            if (empty($jadwal->tahun_ajaran_id)) {
                $jadwal->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function dibuatOleh()
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
