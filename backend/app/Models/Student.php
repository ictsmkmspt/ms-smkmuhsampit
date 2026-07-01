<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = ['user_id', 'class_room_id', 'nis', 'barcode_code', 'total_poin'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function violations()
    {
        return $this->hasMany(Violation::class);
    }

    public function tambahPoin(int $poin): void
    {
        $this->increment('total_poin', $poin);
    }
}
