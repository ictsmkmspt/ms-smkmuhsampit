<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PpdbPembayaran extends Model
{
    protected $table = 'ppdb_pembayarans';

    protected $fillable = ['ppdb_pendaftar_id', 'nominal', 'metode', 'tanggal_bayar', 'catatan', 'dicatat_oleh_id'];

    public function pendaftar()
    {
        return $this->belongsTo(PpdbPendaftar::class, 'ppdb_pendaftar_id');
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh_id');
    }
}
