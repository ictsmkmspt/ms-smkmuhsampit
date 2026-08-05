<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Period extends Model
{
    protected $fillable = ['tahun_ajaran_id', 'hari', 'jam_ke', 'waktu_mulai', 'waktu_selesai', 'tipe', 'label_khusus', 'warna'];

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }
}
