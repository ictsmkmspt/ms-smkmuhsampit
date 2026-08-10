<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    protected $fillable = ['user_id', 'class_room_id', 'nis', 'jenis_kelamin', 'barcode_code', 'total_poin', 'total_prestasi', 'status', 'tanggal_lulus'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function classRoom()
    {
        return $this->belongsTo(ClassRoom::class);
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

    public function bkCases()
    {
        return $this->hasMany(BkCase::class);
    }

    public function sanksiKejadian()
    {
        return $this->hasMany(SanksiKejadian::class);
    }

    public function tagihanLains()
    {
        return $this->hasMany(TagihanLain::class);
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
        $this->increment('total_poin', $poin);

        if ($poin > 0) {
            $this->deteksiSanksiKejadian();
        }
    }

    public function deteksiSanksiKejadian(): void
    {
        $rule = SanksiRule::untukPoin($this->total_poin);
        if (!$rule) {
            return;
        }

        $sudahDiproses = SanksiKejadian::where('student_id', $this->id)
            ->where('sanksi_rule_id', $rule->id)
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
