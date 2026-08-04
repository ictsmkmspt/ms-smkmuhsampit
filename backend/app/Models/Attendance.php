<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = ['student_id', 'class_room_id', 'date', 'time_in', 'status', 'scanned_by', 'tahun_ajaran_id'];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — sama seperti Violation/Achievement/PklPlacement.
     */
    protected static function booted(): void
    {
        static::creating(function (Attendance $attendance) {
            if (empty($attendance->tahun_ajaran_id)) {
                $attendance->tahun_ajaran_id = TahunAjaran::aktifId();
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
}
