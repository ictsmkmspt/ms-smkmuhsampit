<?php

namespace App\Models;

use App\Services\NotificationDispatcher;
use Illuminate\Database\Eloquent\Model;

/**
 * Lowongan kerja yang dipasang 1 perusahaan mitra (IDUKA) — bagian dari
 * fitur BKK. Tidak langsung tayang publik begitu dibuat (status "draf"),
 * wajib diverifikasi Waka Humas dulu (status "dibuka") sebelum muncul di
 * papan loker alumni maupun halaman publik /bursakerjakhusus.
 */
class JobVacancy extends Model
{
    protected $fillable = [
        'iduka_id', 'sumber', 'jurusan_id', 'posisi', 'deskripsi', 'kualifikasi',
        'gaji', 'foto_brosur', 'kuota', 'tanggal_tutup', 'status', 'catatan_revisi',
    ];

    protected $appends = ['foto_brosur_url'];

    protected function casts(): array
    {
        return [
            'tanggal_tutup' => 'date:Y-m-d',
        ];
    }

    public function getFotoBrosurUrlAttribute(): ?string
    {
        return $this->foto_brosur ? '/storage/' . $this->foto_brosur : null;
    }

    public function iduka()
    {
        return $this->belongsTo(Iduka::class);
    }

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class);
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }

    /**
     * Tayang publik = sudah disetujui DAN belum lewat tanggal tutup (kalau
     * ada batas waktunya).
     */
    public function scopeTayang($query)
    {
        return $query->where('status', 'dibuka')
            ->where(function ($q) {
                $q->whereNull('tanggal_tutup')->orWhereDate('tanggal_tutup', '>=', now()->toDateString());
            });
    }

    /**
     * Begitu lowongan ditutup (oleh IDUKA sendiri, dipaksa BKK, atau
     * otomatis lewat command jadwal karena tanggal_tutup lewat), semua
     * lamaran yang masih "diajukan" (belum sempat diputuskan) otomatis
     * jadi "ditolak" — supaya tidak ada lamaran menggantung selamanya, dan
     * alumni yang bersangkutan tahu lowongannya sudah tidak diproses lagi.
     */
    public function tolakSisaLamaran(): void
    {
        $sisa = $this->applications()->where('status', 'diajukan')->with('student.user')->get();

        foreach ($sisa as $lamaran) {
            $lamaran->update(['status' => 'ditolak', 'catatan' => 'Lowongan sudah ditutup.']);

            if ($lamaran->student->user) {
                NotificationDispatcher::send(
                    $lamaran->student->user,
                    'lowongan',
                    'Status lamaran diperbarui',
                    "Lowongan \"{$this->posisi}\" sudah ditutup — lamaran kamu belum berhasil kali ini.",
                    '/siswa'
                );
            }
        }
    }
}
