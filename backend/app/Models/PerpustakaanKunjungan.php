<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerpustakaanKunjungan extends Model
{
    protected $table = 'perpustakaan_kunjungan';

    protected $fillable = ['pengunjung_type', 'pengunjung_id', 'keperluan', 'tanggal', 'dicatat_oleh'];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
    ];

    public function pengunjung()
    {
        return $this->morphTo();
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
