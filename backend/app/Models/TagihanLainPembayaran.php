<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TagihanLainPembayaran extends Model
{
    protected $table = 'tagihan_lain_pembayaran';

    protected $fillable = ['tagihan_lain_id', 'jumlah', 'tanggal_bayar', 'dicatat_oleh', 'keterangan'];

    protected $casts = [
        'tanggal_bayar' => 'date:Y-m-d',
    ];

    public function tagihanLain()
    {
        return $this->belongsTo(TagihanLain::class);
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
