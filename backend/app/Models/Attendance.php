<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $fillable = ['student_id', 'class_room_id', 'date', 'time_in', 'status', 'scanned_by'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
