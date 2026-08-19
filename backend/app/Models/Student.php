<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Student extends Model
{
    protected $fillable = [
        'user_id', 'class_room_id', 'jurusan_id', 'nis', 'nisn', 'jenis_kelamin', 'qr_code', 'foto',
        'tempat_lahir', 'tanggal_lahir', 'alamat', 'total_poin', 'total_prestasi', 'status', 'tanggal_lulus',
    ];

    protected $appends = ['foto_url'];

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto ? '/storage/' . $this->foto : null;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function jurusan()
    {
        return $this->belongsTo(Jurusan::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function violations()
    {
        return $this->hasMany(Violation::class);
    }

    public function prayerAttendances()
    {
        return $this->hasMany(PrayerAttendance::class);
    }

    public function achievements()
    {
        return $this->hasMany(Achievement::class);
    }

    public function pklPlacements()
    {
        return $this->hasMany(PklPlacement::class);
    }

    public function spps()
    {
        return $this->hasMany(Spp::class);
    }

    public function sanksiKejadian()
    {
        return $this->hasMany(SanksiKejadian::class);
    }

    public function peminjamanPerpustakaan()
    {
        return $this->morphMany(PerpustakaanPeminjaman::class, 'peminjam');
    }

    /**
     * Penempatan PKL yang sedang berjalan sekarang (kalau ada). Dipakai untuk
     * menentukan apakah menu PKL perlu muncul di dashboard siswa, dan sebagai
     * sumber lokasi DUDI + guru pembimbing untuk absensi radius.
     */
    public function pklPlacementAktif()
    {
        return $this->hasOne(PklPlacement::class)->where('status', 'aktif');
    }

    /**
     * Penempatan PKL siswa ini yang "relevan sekarang" — diutamakan yang
     * masih AKTIF, tapi kalau tidak ada (semua sudah "selesai"), tetap
     * kembalikan yang PALING BARU. Dipakai untuk absensi/jurnal/riwayat
     * siswa supaya tidak mendadak kosong begitu status PKL-nya berubah
     * jadi "selesai" — beda dari pklPlacementAktif() yang SENGAJA
     * aktif-only (dipakai buat cek "apakah sedang PKL sekarang", mis.
     * radius absensi & tampil/tidaknya menu PKL di dashboard).
     */
    public function pklPlacementTerkini(): ?PklPlacement
    {
        return $this->pklPlacements()
            ->orderByRaw("status = 'aktif' desc")
            ->orderByDesc('tanggal_mulai')
            ->first();
    }

    public function parents()
    {
        return $this->belongsToMany(User::class, 'parent_student', 'student_id', 'parent_id')
            ->withPivot('hubungan')
            ->withTimestamps();
    }

    /**
     * Nambah/kurangi poin pelanggaran. Kalau poinnya bertambah (bukan
     * dikurangi lewat koreksi), sekalian dicek apakah total_poin yang baru
     * melewati ambang batas Sanksi Bertingkat — kalau ya dan belum ada
     * kejadian yang masih "diproses" untuk tahap itu, catat kejadian baru
     * supaya muncul di daftar tugas BK (bukan cuma dihitung ulang tiap
     * dilihat seperti SanksiRuleController::siswa(), tapi benar-benar
     * tersimpan & bisa ditindaklanjuti/ditandai selesai).
     */
    public function tambahPoin(int $poin): void
    {
        // lockForUpdate + transaksi supaya 2 pelanggaran nyaris bersamaan
        // (mis. guru & BK sama-sama input di waktu yang mepet) tidak
        // sama-sama lolos cek "sudah ada kejadian diproses?" sebelum
        // salah satunya sempat insert — yang tadinya bisa menghasilkan 2
        // baris SanksiKejadian dobel untuk kenaikan poin yang sama.
        DB::transaction(function () use ($poin) {
            $locked = static::whereKey($this->id)->lockForUpdate()->first();
            $locked->increment('total_poin', $poin);
            $this->total_poin = $locked->total_poin;

            if ($poin > 0) {
                $this->deteksiSanksiKejadian();
            }
        });
    }

    public function deteksiSanksiKejadian(): void
    {
        $rule = SanksiRule::untukPoin($this->total_poin);
        if (!$rule) {
            return;
        }

        // Dibatasi ke tahun ajaran AKTIF — total_poin dihitung ulang per
        // tahun ajaran (lihat TahunAjaranController::aktifkan()), jadi
        // kejadian "diproses" dari tahun ajaran lama yang belum sempat
        // ditutup BK tidak boleh ikut dianggap "sudah pernah" untuk
        // kenaikan poin di tahun ajaran yang sedang berjalan — kalau
        // dibiarkan global, siswa yang kena ambang batas yang sama lagi
        // di tahun ajaran baru diam-diam TIDAK tercatat sama sekali.
        $sudahDiproses = SanksiKejadian::where('student_id', $this->id)
            ->where('sanksi_rule_id', $rule->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->where('status', 'diproses')
            ->exists();

        if ($sudahDiproses) {
            return;
        }

        SanksiKejadian::create([
            'student_id' => $this->id,
            'sanksi_rule_id' => $rule->id,
            'total_poin_saat_itu' => $this->total_poin,
        ]);
    }

    public function tambahPrestasi(int $poin): void
    {
        $this->increment('total_prestasi', $poin);
    }
}
