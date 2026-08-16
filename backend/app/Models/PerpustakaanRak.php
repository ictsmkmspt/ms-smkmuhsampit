<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerpustakaanRak extends Model
{
    protected $table = 'perpustakaan_rak';

    protected $fillable = ['nama'];

    public function buku()
    {
        return $this->hasMany(Buku::class, 'rak_id');
    }
}
