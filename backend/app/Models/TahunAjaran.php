<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TahunAjaran extends Model
{
    protected $fillable = ['nama', 'status', 'tanggal_mulai', 'tanggal_selesai'];

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

    public function academicEvents()
    {
        return $this->hasMany(AcademicEvent::class);
    }

    public function teachingAssignments()
    {
        return $this->hasMany(TeachingAssignment::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    public function bkCases()
    {
        return $this->hasMany(BkCase::class);
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
