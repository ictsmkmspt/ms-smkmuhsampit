<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrayerAttendance extends Model
{
    protected $fillable = ['student_id', 'class_room_id', 'date', 'status', 'recorded_by'];

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
