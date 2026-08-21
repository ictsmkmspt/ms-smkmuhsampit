<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtMateri extends Model
{
    protected $table = 'cbt_materi';

    protected $fillable = ['teacher_id', 'subject_id', 'tp_id', 'tahun_ajaran_id', 'judul', 'isi', 'gambar_path', 'status', 'hits'];

    protected $appends = ['gambar_url'];

    protected static function booted(): void
    {
        static::creating(function (CbtMateri $materi) {
            if (empty($materi->tahun_ajaran_id)) {
                $materi->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function getGambarUrlAttribute(): ?string
    {
        return $this->gambar_path ? '/storage/'.$this->gambar_path : null;
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

    public function tp()
    {
        return $this->belongsTo(CbtTujuanPembelajaran::class, 'tp_id');
    }

    /**
     * Latihan (bukan ujian) yang dilampirkan ke materi ini — dipilih guru
     * saat membuat latihan lewat Buat Ujian, bukan dari sisi Materi.
     */
    public function latihan()
    {
        return $this->hasMany(CbtExam::class, 'materi_id')->where('tipe', 'latihan');
    }
}
