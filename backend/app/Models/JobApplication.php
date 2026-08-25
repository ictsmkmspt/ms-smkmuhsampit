<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Lamaran 1 alumni ke 1 lowongan (JobVacancy). Dibatasi unik per pasangan
 * job_vacancy_id+student_id di migrasi — 1 alumni tidak bisa melamar lowongan
 * yang sama 2x.
 */
class JobApplication extends Model
{
    protected $fillable = ['job_vacancy_id', 'student_id', 'status', 'catatan'];

    public function jobVacancy()
    {
        return $this->belongsTo(JobVacancy::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
