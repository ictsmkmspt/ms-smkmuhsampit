<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = ['nama', 'jenis', 'kapasitas', 'penanggung_jawab', 'keterangan'];

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }

    public function maintenanceRequests()
    {
        return $this->hasMany(MaintenanceRequest::class);
    }
}
