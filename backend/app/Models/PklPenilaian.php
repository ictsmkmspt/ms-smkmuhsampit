<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklPenilaian extends Model
{
    protected $fillable = [
        'pkl_placement_id', 'skor_disiplin', 'skor_sikap', 'skor_komunikasi',
        'skor_inisiatif', 'skor_k3', 'catatan', 'nilai_akhir', 'submitted_by',
    ];

    public function placement()
    {
        return $this->belongsTo(PklPlacement::class, 'pkl_placement_id');
    }

    public function kompetensis()
    {
        return $this->hasMany(PklPenilaianKompetensi::class)->orderBy('urutan');
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }
}
