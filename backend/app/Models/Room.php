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

    /**
     * Akun Teknisi/Kepala Bengkel yang ditugaskan ke ruang ini.
     */
    public function staff()
    {
        return $this->hasMany(User::class);
    }
}
