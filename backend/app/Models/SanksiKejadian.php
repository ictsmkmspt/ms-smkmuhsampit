<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SanksiKejadian extends Model
{
    protected $table = 'sanksi_kejadian';

    protected $fillable = [
        'student_id', 'sanksi_rule_id', 'tahun_ajaran_id', 'total_poin_saat_itu',
        'status', 'catatan_penyelesaian', 'diproses_oleh', 'selesai_at',
    ];

    protected $casts = [
        'selesai_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (SanksiKejadian $kejadian) {
            if (empty($kejadian->tahun_ajaran_id)) {
                $kejadian->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function sanksiRule()
    {
        return $this->belongsTo(SanksiRule::class);
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function diprosesOleh()
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }

    public function bkCases()
    {
        return $this->hasMany(BkCase::class);
    }
}
