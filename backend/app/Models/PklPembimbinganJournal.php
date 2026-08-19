<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklPembimbinganJournal extends Model
{
    protected $fillable = [
        'teacher_id', 'iduka_id', 'date',
        'aktivitas', 'catatan', 'verified_by', 'verified_at',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function iduka()
    {
        return $this->belongsTo(Iduka::class);
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
