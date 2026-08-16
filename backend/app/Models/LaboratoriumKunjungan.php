<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LaboratoriumKunjungan extends Model
{
    protected $table = 'laboratorium_kunjungan';

    protected $fillable = ['room_id', 'pengunjung_type', 'pengunjung_id', 'keperluan', 'tanggal', 'dicatat_oleh'];

    protected $casts = [
        'tanggal' => 'date:Y-m-d',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function pengunjung()
    {
        return $this->morphTo();
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
