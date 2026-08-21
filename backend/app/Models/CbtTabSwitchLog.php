<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtTabSwitchLog extends Model
{
    protected $fillable = ['attempt_id', 'event_type'];

    public function attempt()
    {
        return $this->belongsTo(CbtExamAttempt::class, 'attempt_id');
    }
}
