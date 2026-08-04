<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Achievement extends Model
{
    protected $fillable = ['student_id', 'achievement_type_id', 'date', 'poin', 'note', 'recorded_by', 'tahun_ajaran_id'];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — supaya semua controller yang bikin Achievement tidak perlu
     * diubah satu-satu.
     */
    protected static function booted(): void
    {
        static::creating(function (Achievement $achievement) {
            if (empty($achievement->tahun_ajaran_id)) {
                $achievement->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function achievementType()
    {
        return $this->belongsTo(AchievementType::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
