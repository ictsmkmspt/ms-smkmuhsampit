<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklJournal extends Model
{
    protected $fillable = [
        'pkl_placement_id', 'student_id', 'date',
        'kegiatan', 'catatan', 'catatan_by', 'catatan_at',
    ];

    public function placement()
    {
        return $this->belongsTo(PklPlacement::class, 'pkl_placement_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function catatanBy()
    {
        return $this->belongsTo(User::class, 'catatan_by');
    }
}
