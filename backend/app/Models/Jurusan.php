<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jurusan extends Model
{
    protected $fillable = ['kode', 'nama'];

    public function students()
    {
        return $this->hasMany(Student::class);
    }
}
