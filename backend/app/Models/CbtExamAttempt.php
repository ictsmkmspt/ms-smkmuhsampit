<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtExamAttempt extends Model
{
    protected $fillable = ['exam_id', 'student_id', 'status', 'started_at', 'submitted_at', 'skor', 'tab_switch_count', 'extra_minutes', 'soal_acak', 'device_token'];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'soal_acak' => 'array',
    ];

    public function exam()
    {
        return $this->belongsTo(CbtExam::class, 'exam_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function answers()
    {
        return $this->hasMany(CbtExamAnswer::class, 'attempt_id');
    }

    public function tabSwitchLogs()
    {
        return $this->hasMany(CbtTabSwitchLog::class, 'attempt_id');
    }
}
