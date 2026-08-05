<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class PpdbPendaftar extends Model
{
    protected $table = 'ppdb_pendaftars';

    protected $fillable = [
        'kode_pendaftaran', 'nama_lengkap', 'nisn', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir',
        'alamat', 'asal_sekolah', 'nama_orang_tua', 'no_hp_orang_tua', 'jurusan_pilihan', 'status', 'catatan',
    ];

    /**
     * Kode unik untuk pendaftar cek status pendaftarannya sendiri tanpa
     * perlu akun login (PPDB dibuka untuk calon siswa yang belum punya akun
     * sama sekali di sistem).
     */
    public static function buatKodePendaftaran(): string
    {
        do {
            $kode = 'PPDB-' . now()->format('y') . '-' . Str::upper(Str::random(6));
        } while (static::where('kode_pendaftaran', $kode)->exists());

        return $kode;
    }
}
