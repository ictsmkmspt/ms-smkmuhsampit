<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenanceRequest extends Model
{
    protected $fillable = ['asset_id', 'room_id', 'deskripsi', 'pelapor', 'status', 'tanggal_lapor', 'tanggal_selesai', 'catatan_penyelesaian'];

    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
