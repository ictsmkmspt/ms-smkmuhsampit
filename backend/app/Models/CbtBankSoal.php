<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtBankSoal extends Model
{
    protected $table = 'cbt_bank_soal';

    protected $fillable = ['teacher_id', 'subject_id', 'nama', 'dibagikan'];

    protected $casts = ['dibagikan' => 'boolean'];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function questions()
    {
        return $this->hasMany(CbtQuestion::class, 'bank_id');
    }
}
