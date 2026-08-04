<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklPlacement extends Model
{
    protected $fillable = [
        'student_id', 'dudi_id', 'guru_pembimbing_id',
        'tanggal_mulai', 'tanggal_selesai', 'status',
        'nilai_akhir', 'catatan_pembimbing', 'tahun_ajaran_id',
    ];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — supaya penempatan PKL bisa dikelompokkan per angkatan.
     */
    protected static function booted(): void
    {
        static::creating(function (PklPlacement $placement) {
            if (empty($placement->tahun_ajaran_id)) {
                $placement->tahun_ajaran_id = TahunAjaran::aktifId();
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

    public function dudi()
    {
        return $this->belongsTo(Dudi::class);
    }

    public function guruPembimbing()
    {
        return $this->belongsTo(Teacher::class, 'guru_pembimbing_id');
    }

    public function attendances()
    {
        return $this->hasMany(PklAttendance::class);
    }

    public function journals()
    {
        return $this->hasMany(PklJournal::class);
    }

    public function penilaian()
    {
        return $this->hasOne(PklPenilaian::class);
    }

    public function isAktif(): bool
    {
        return $this->status === 'aktif';
    }
}
