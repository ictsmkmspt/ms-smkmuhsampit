<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    protected $fillable = [
        'kode_aset', 'nama', 'merk_model', 'no_seri_pabrik', 'ukuran', 'bahan',
        'jumlah_baik', 'jumlah_rusak_ringan', 'jumlah_rusak_berat', 'room_id', 'tanggal_perolehan', 'keterangan',
    ];

    protected $appends = ['jumlah'];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function maintenanceRequests()
    {
        return $this->hasMany(MaintenanceRequest::class);
    }

    /**
     * Total seluruh kondisi digabung — dipakai tampilan ringkas (mis.
     * label QR/barcode) yang tidak perlu tahu rinciannya per kondisi.
     */
    protected function jumlah(): Attribute
    {
        return Attribute::get(fn () => $this->jumlah_baik + $this->jumlah_rusak_ringan + $this->jumlah_rusak_berat);
    }
}
