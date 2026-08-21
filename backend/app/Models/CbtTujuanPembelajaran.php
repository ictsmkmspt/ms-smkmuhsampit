<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Tujuan Pembelajaran (TP) — wadah pengelompokan Materi per mata
 * pelajaran, sesuai struktur Kurikulum Merdeka. 1 TP dibuat guru untuk 1
 * mapel, lalu Materi bacaan ditulis di dalam TP tersebut.
 */
class CbtTujuanPembelajaran extends Model
{
    protected $table = 'cbt_tujuan_pembelajaran';

    protected $fillable = ['teacher_id', 'subject_id', 'tahun_ajaran_id', 'judul', 'urutan'];

    protected static function booted(): void
    {
        static::creating(function (CbtTujuanPembelajaran $tp) {
            if (empty($tp->tahun_ajaran_id)) {
                $tp->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function materiList()
    {
        return $this->hasMany(CbtMateri::class, 'tp_id');
    }
}
