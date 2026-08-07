<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicScore extends Model
{
    protected $fillable = ['student_id', 'subject_id', 'tahun_ajaran_id', 'nama_kegiatan', 'skor', 'tanggal', 'recorded_by'];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — pola yang sama dipakai Violation/Achievement/PklPlacement.
     */
    protected static function booted(): void
    {
        static::creating(function (AcademicScore $score) {
            if (empty($score->tahun_ajaran_id)) {
                $score->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
