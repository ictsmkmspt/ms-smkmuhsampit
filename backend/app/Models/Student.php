<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = ['user_id', 'class_room_id', 'nis', 'jenis_kelamin', 'barcode_code', 'total_poin', 'total_prestasi', 'status', 'tanggal_lulus'];

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

    public function prayerAttendances()
    {
        return $this->hasMany(PrayerAttendance::class);
    }

    public function achievements()
    {
        return $this->hasMany(Achievement::class);
    }

    public function pklPlacements()
    {
        return $this->hasMany(PklPlacement::class);
    }

    public function spps()
    {
        return $this->hasMany(Spp::class);
    }

    /**
     * Penempatan PKL yang sedang berjalan sekarang (kalau ada). Dipakai untuk
     * menentukan apakah menu PKL perlu muncul di dashboard siswa, dan sebagai
     * sumber lokasi DUDI + guru pembimbing untuk absensi radius.
     */
    public function pklPlacementAktif()
    {
        return $this->hasOne(PklPlacement::class)->where('status', 'aktif');
    }

    public function parents()
    {
        return $this->belongsToMany(User::class, 'parent_student', 'student_id', 'parent_id')
            ->withPivot('hubungan')
            ->withTimestamps();
    }

    public function tambahPoin(int $poin): void
    {
        $this->increment('total_poin', $poin);
    }

    public function tambahPrestasi(int $poin): void
    {
        $this->increment('total_prestasi', $poin);
    }
}
