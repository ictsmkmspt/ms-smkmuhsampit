<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    protected $fillable = ['kode_aset', 'nama', 'kategori', 'kondisi', 'jumlah', 'room_id', 'tanggal_perolehan', 'keterangan'];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function maintenanceRequests()
    {
        return $this->hasMany(MaintenanceRequest::class);
    }
}
