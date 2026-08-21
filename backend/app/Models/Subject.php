<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    protected $fillable = ['kode', 'nama', 'tipe'];

    public function teachingAssignments()
    {
        return $this->hasMany(TeachingAssignment::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}
