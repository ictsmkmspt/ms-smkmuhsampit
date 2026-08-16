<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SppPembayaran extends Model
{
    protected $table = 'spp_pembayaran';

    protected $fillable = ['spp_id', 'jumlah', 'tanggal_bayar', 'dicatat_oleh', 'keterangan'];

    protected $casts = [
        'tanggal_bayar' => 'date:Y-m-d',
    ];

    public function spp()
    {
        return $this->belongsTo(Spp::class);
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
