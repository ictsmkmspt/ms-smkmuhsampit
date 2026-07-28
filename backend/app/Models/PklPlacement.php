<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklPlacement extends Model
{
    protected $fillable = [
        'student_id', 'dudi_id', 'guru_pembimbing_id',
        'tanggal_mulai', 'tanggal_selesai', 'status',
        'nilai_akhir', 'catatan_pembimbing',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function dudi()
    {
        return $this->belongsTo(Dudi::class);
    }

    public function guruPembimbing()
    {
        return $this->belongsTo(Teacher::class, 'guru_pembimbing_id');
    }

    public function attendances()
    {
        return $this->hasMany(PklAttendance::class);
    }

    public function isAktif(): bool
    {
        return $this->status === 'aktif';
    }
}
