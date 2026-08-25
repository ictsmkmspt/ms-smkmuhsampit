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
        'iduka_id', 'sumber', 'nama_perusahaan_manual', 'email_manual', 'telepon_manual',
        'alamat_manual', 'jurusan_id', 'posisi', 'deskripsi', 'kualifikasi',
        'gaji', 'foto_brosur', 'kuota', 'tanggal_tutup', 'status', 'catatan_revisi',
    ];

    protected $appends = [
        'foto_brosur_url', 'nama_perusahaan_tampil', 'email_tampil', 'telepon_tampil', 'alamat_tampil',
    ];

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

    /**
     * 4 accessor "tampil" di bawah ini — dipakai SELURUH frontend
     * (publik/siswa/BKK) supaya tidak perlu tahu apakah 1 lowongan
     * terhubung ke baris IDUKA (storeIduka(), self-service) atau isian
     * manual BKK (storeBkk(), tanpa iduka_id — lihat migrasi
     * 2026_08_25_125213). Utamakan data IDUKA (lebih akurat/terverifikasi)
     * kalau ada, baru fallback ke isian manual.
     */
    public function getNamaPerusahaanTampilAttribute(): ?string
    {
        return $this->iduka?->nama_perusahaan ?? $this->nama_perusahaan_manual;
    }

    public function getEmailTampilAttribute(): ?string
    {
        return $this->iduka?->user?->email ?? $this->email_manual;
    }

    public function getTeleponTampilAttribute(): ?string
    {
        return $this->iduka?->telepon ?? $this->telepon_manual;
    }

    public function getAlamatTampilAttribute(): ?string
    {
        return $this->iduka?->alamat ?? $this->alamat_manual;
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
