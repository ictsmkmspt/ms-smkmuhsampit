<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TadarusScore extends Model
{
    protected $fillable = ['student_id', 'surah', 'ayat_mulai', 'ayat_selesai', 'keterangan', 'tanggal', 'recorded_by'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
