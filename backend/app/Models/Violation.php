<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Violation extends Model
{
    protected $fillable = ['student_id', 'attendance_id', 'date', 'type', 'poin'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
