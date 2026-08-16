<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Teacher extends Model
{
    protected $fillable = ['user_id', 'nip', 'qr_code', 'jenis_kelamin'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Kelas di mana guru ini menjadi wali kelas (kalau ada).
    public function homeroomOf()
    {
        return $this->hasOne(ClassRoom::class, 'homeroom_teacher_id');
    }

    // Penempatan PKL siswa yang dibimbing guru ini.
    public function pklPlacements()
    {
        return $this->hasMany(PklPlacement::class, 'guru_pembimbing_id');
    }

    public function peminjamanPerpustakaan()
    {
        return $this->morphMany(PerpustakaanPeminjaman::class, 'peminjam');
    }
}
