<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PeriodTemplate extends Model
{
    protected $fillable = ['hari', 'jam_ke', 'waktu_mulai', 'waktu_selesai', 'tipe', 'label_khusus', 'warna'];
}
