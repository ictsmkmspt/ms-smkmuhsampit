<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PklPenilaianKompetensi extends Model
{
    protected $fillable = ['pkl_penilaian_id', 'nama_kompetensi', 'skor', 'urutan'];

    public function penilaian()
    {
        return $this->belongsTo(PklPenilaian::class, 'pkl_penilaian_id');
    }
}
