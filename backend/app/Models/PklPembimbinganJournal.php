<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklPembimbinganJournal extends Model
{
    protected $fillable = [
        'teacher_id', 'dudi_id', 'date',
        'aktivitas', 'catatan', 'verified_by', 'verified_at',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function dudi()
    {
        return $this->belongsTo(Dudi::class);
    }

    public function verifiedBy()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
