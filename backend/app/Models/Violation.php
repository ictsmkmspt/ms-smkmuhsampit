<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Violation extends Model
{
    protected $fillable = ['student_id', 'attendance_id', 'violation_type_id', 'date', 'type', 'poin', 'note', 'recorded_by', 'tahun_ajaran_id'];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — supaya semua controller yang bikin Violation tidak perlu
     * diubah satu-satu.
     */
    protected static function booted(): void
    {
        static::creating(function (Violation $violation) {
            if (empty($violation->tahun_ajaran_id)) {
                $violation->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function violationType()
    {
        return $this->belongsTo(ViolationType::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
