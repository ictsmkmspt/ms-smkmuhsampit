<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Buku extends Model
{
    protected $table = 'perpustakaan_buku';

    protected $fillable = [
        'judul', 'kode_buku', 'penulis', 'penerbit', 'tahun_terbit', 'isbn', 'kategori_id',
        'sinopsis', 'cover', 'rak_id', 'dibuat_oleh',
    ];

    protected $appends = ['cover_url'];

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover ? '/storage/' . $this->cover : null;
    }

    public function eksemplars()
    {
        return $this->hasMany(BukuEksemplar::class, 'buku_id');
    }

    public function kategori()
    {
        return $this->belongsTo(PerpustakaanKategori::class, 'kategori_id');
    }

    public function rak()
    {
        return $this->belongsTo(PerpustakaanRak::class, 'rak_id');
    }

    public function dibuatOleh()
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
