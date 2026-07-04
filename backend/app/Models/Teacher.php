<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    protected $fillable = ['user_id', 'nip'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Kelas di mana guru ini menjadi wali kelas (kalau ada).
    public function homeroomOf()
    {
        return $this->hasOne(ClassRoom::class, 'homeroom_teacher_id');
    }
}
