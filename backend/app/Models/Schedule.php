<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    protected $fillable = ['class_room_id', 'subject_id', 'teacher_id', 'tahun_ajaran_id', 'period_id', 'kode', 'teaching_assignment_id'];

    public function period()
    {
        return $this->belongsTo(PeriodTemplate::class, 'period_id');
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

}
