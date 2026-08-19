<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicEvent extends Model
{
    protected $fillable = ['tahun_ajaran_id', 'nama', 'jenis', 'tanggal_mulai', 'tanggal_selesai', 'keterangan'];
}
