<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BukuEksemplar extends Model
{
    protected $table = 'perpustakaan_eksemplar';

    protected $fillable = ['buku_id', 'kode_eksemplar', 'status'];

    public function buku()
    {
        return $this->belongsTo(Buku::class, 'buku_id');
    }

    public function peminjaman()
    {
        return $this->hasMany(PerpustakaanPeminjaman::class, 'eksemplar_id');
    }

    /**
     * Peminjaman yang sedang berjalan untuk eksemplar ini (kalau ada) —
     * dipakai alur "Kembali" begitu eksemplar di-scan.
     */
    public function peminjamanAktif()
    {
        return $this->hasOne(PerpustakaanPeminjaman::class, 'eksemplar_id')->where('status', 'dipinjam');
    }
}
