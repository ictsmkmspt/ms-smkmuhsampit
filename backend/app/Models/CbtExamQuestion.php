<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtExamQuestion extends Model
{
    protected $fillable = ['exam_id', 'question_id', 'urutan'];

    public function exam()
    {
        return $this->belongsTo(CbtExam::class, 'exam_id');
    }

    public function question()
    {
        return $this->belongsTo(CbtQuestion::class, 'question_id');
    }
}
