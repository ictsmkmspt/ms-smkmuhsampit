<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TahunAjaran extends Model
{
    protected $fillable = ['nama', 'status'];

    public function violations()
    {
        return $this->hasMany(Violation::class);
    }

    public function achievements()
    {
        return $this->hasMany(Achievement::class);
    }

    public function pklPlacements()
    {
        return $this->hasMany(PklPlacement::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function prayerAttendances()
    {
        return $this->hasMany(PrayerAttendance::class);
    }

    /**
     * ID tahun ajaran yang sedang aktif — dipakai model lain (Violation,
     * Achievement, PklPlacement, Attendance, PrayerAttendance) buat otomatis
     * menandai data baru masuk tahun ajaran mana, tanpa tiap controller
     * harus isi manual.
     */
    public static function aktifId(): ?int
    {
        return static::where('status', 'aktif')->value('id');
    }
}
