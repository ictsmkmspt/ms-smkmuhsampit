<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerpustakaanKategori extends Model
{
    protected $table = 'perpustakaan_kategori';

    protected $fillable = ['nama'];

    public function buku()
    {
        return $this->hasMany(Buku::class, 'kategori_id');
    }
}
