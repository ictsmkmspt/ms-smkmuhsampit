<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TahsinScore extends Model
{
    protected $fillable = ['student_id', 'tahun_ajaran_id', 'jilid', 'halaman', 'keterangan', 'tanggal', 'recorded_by'];

    protected static function booted(): void
    {
        static::creating(function (TahsinScore $score) {
            if (empty($score->tahun_ajaran_id)) {
                $score->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
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
