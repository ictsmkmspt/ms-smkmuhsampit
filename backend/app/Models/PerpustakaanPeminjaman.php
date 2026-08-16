<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerpustakaanPeminjaman extends Model
{
    protected $table = 'perpustakaan_peminjaman';

    protected $fillable = [
        'eksemplar_id', 'peminjam_type', 'peminjam_id', 'diproses_oleh',
        'tanggal_pinjam', 'tanggal_jatuh_tempo', 'tanggal_kembali', 'status',
    ];

    // Format eksplisit ("date:Y-m-d") sengaja dipakai, BUKAN cast 'date'
    // polos — cast polos diserialisasi ke JSON dengan konversi UTC
    // (mis. tengah malam WIB jadi "...T17:00:00.000000Z" hari SEBELUMNYA),
    // yang kalau diambil 10 karakter pertama di frontend (fmtDMY) jadi
    // tanggal MUNDUR 1 hari. Format eksplisit di-format langsung dari
    // Carbon di timezone aplikasi, tanpa konversi UTC.
    protected $casts = [
        'tanggal_pinjam' => 'date:Y-m-d',
        'tanggal_jatuh_tempo' => 'date:Y-m-d',
        'tanggal_kembali' => 'date:Y-m-d',
    ];

    protected $appends = ['terlambat', 'hari_terlambat'];

    public function eksemplar()
    {
        return $this->belongsTo(BukuEksemplar::class, 'eksemplar_id');
    }

    public function peminjam()
    {
        return $this->morphTo();
    }

    public function diprosesOleh()
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }

    /**
     * Dihitung saat baca, TIDAK disimpan — cuma benar kalau statusnya
     * masih "dipinjam" (peminjaman yang sudah dikembalikan/rusak/hilang
     * tidak lagi dianggap "terlambat berjalan", walau dulu sempat lewat
     * jatuh tempo sebelum diproses).
     */
    public function getTerlambatAttribute(): bool
    {
        // Jatuh tempo HARI INI belum dianggap terlambat — baru terlambat
        // begitu tanggal jatuh tempo sudah lewat (kemarin atau sebelumnya).
        return $this->status === 'dipinjam' && $this->tanggal_jatuh_tempo->lt(now()->startOfDay());
    }

    public function getHariTerlambatAttribute(): int
    {
        if (!$this->terlambat) {
            return 0;
        }
        return (int) $this->tanggal_jatuh_tempo->diffInDays(now()->startOfDay());
    }
}
