<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrayerAttendance extends Model
{
    protected $fillable = ['student_id', 'class_room_id', 'date', 'status', 'recorded_by', 'tahun_ajaran_id'];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — sama seperti Violation/Achievement/PklPlacement/Attendance.
     */
    protected static function booted(): void
    {
        static::creating(function (PrayerAttendance $prayerAttendance) {
            if (empty($prayerAttendance->tahun_ajaran_id)) {
                $prayerAttendance->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
