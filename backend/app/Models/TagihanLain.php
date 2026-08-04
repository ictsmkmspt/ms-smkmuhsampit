<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TagihanLain extends Model
{
    protected $fillable = [
        'student_id', 'nama_tagihan', 'nominal', 'jumlah_dibayar', 'status', 'tanggal_bayar', 'keterangan', 'dicatat_oleh',
    ];

    protected $casts = [
        'tanggal_bayar' => 'date:Y-m-d',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
