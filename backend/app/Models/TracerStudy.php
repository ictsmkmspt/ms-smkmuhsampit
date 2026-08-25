<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Isian tracer study alumni (survei mandiri "sekarang kamu ngapain?") —
 * beda dari JobApplication (lamaran ke lowongan di sistem ini), tracer
 * study mencakup SEMUA alumni termasuk yang kerja/kuliah/usaha di luar
 * jalur BKK sekolah ini. 1 alumni cuma 1 baris, isi ulang = update.
 */
class TracerStudy extends Model
{
    protected $fillable = ['student_id', 'status_saat_ini', 'nama_perusahaan', 'masa_tunggu_bulan'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
