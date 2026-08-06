<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = ['nama', 'jenis', 'kapasitas', 'teacher_id', 'keterangan'];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }

    public function maintenanceRequests()
    {
        return $this->hasMany(MaintenanceRequest::class);
    }
}
