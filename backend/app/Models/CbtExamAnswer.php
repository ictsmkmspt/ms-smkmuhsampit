<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtExamAnswer extends Model
{
    protected $fillable = ['attempt_id', 'question_id', 'jawaban_dipilih', 'is_correct', 'jawaban_essay', 'nilai_essay', 'status_koreksi'];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function attempt()
    {
        return $this->belongsTo(CbtExamAttempt::class, 'attempt_id');
    }

    public function question()
    {
        return $this->belongsTo(CbtQuestion::class, 'question_id');
    }
}
