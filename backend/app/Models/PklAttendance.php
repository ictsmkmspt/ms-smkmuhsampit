<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklAttendance extends Model
{
    protected $fillable = [
        'pkl_placement_id', 'student_id', 'date',
        'time_in', 'latitude_in', 'longitude_in', 'distance_in_meter',
        'time_out', 'latitude_out', 'longitude_out', 'distance_out_meter',
        'status', 'corrected_by', 'catatan_koreksi',
        'verified_by', 'verified_at',
    ];

    public function placement()
    {
        return $this->belongsTo(PklPlacement::class, 'pkl_placement_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
