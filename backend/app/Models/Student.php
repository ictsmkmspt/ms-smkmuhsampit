<?php

namespace App\Models;

use App\Services\NotificationDispatcher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Student extends Model
{
    protected $fillable = [
        'user_id', 'class_room_id', 'jurusan_id', 'nis', 'nisn', 'jenis_kelamin', 'qr_code', 'foto',
        'tempat_lahir', 'tanggal_lahir', 'alamat', 'total_poin', 'total_prestasi', 'status', 'tanggal_lulus',
        'nik', 'agama', 'kebutuhan_khusus', 'jumlah_saudara', 'anak_ke', 'no_telp',
        'sekolah_asal_nama', 'sekolah_asal_alamat', 'ijazah_tahun', 'ijazah_nomor',
        'tingkat_diterima', 'tanggal_diterima',
        'nama_ayah', 'nama_ibu', 'alamat_ortu', 'telp_ortu', 'pekerjaan_ortu', 'penghasilan_ortu',
        'nama_wali', 'alamat_wali', 'telp_wali', 'pekerjaan_wali',
        'tinggi_badan', 'berat_badan', 'status_pernikahan', 'keahlian', 'pengalaman_kerja',
        'ktp', 'cv', 'sertifikat',
        // Pelengkap "buku induk" biar setara formulir PPDB — lihat migrasi
        // 2026_08_28_090000_add_ppdb_parity_fields_to_students_table.
        'no_registrasi_akta_lahir', 'kewarganegaraan', 'tempat_tinggal', 'tanggal_no_stk',
        'pekerjaan_ayah', 'penghasilan_ayah', 'alamat_ayah', 'no_hp_ayah',
        'pekerjaan_ibu', 'penghasilan_ibu', 'alamat_ibu', 'no_hp_ibu',
        'jarak_rumah_sekolah', 'ukuran_baju', 'hobi',
        'berkas_ijazah', 'berkas_skhu', 'berkas_rapot', 'berkas_skkb', 'berkas_akta_lahir',
        'berkas_kk', 'berkas_kip', 'berkas_formulir_pendaftaran', 'berkas_pernyataan',
    ];

    protected $appends = [
        'foto_url', 'ktp_url', 'cv_url', 'sertifikat_list', 'biodata_lengkap',
        'berkas_ijazah_url', 'berkas_skhu_url', 'berkas_rapot_url', 'berkas_skkb_url', 'berkas_akta_lahir_url',
        'berkas_kk_url', 'berkas_kip_url', 'berkas_formulir_pendaftaran_url', 'berkas_pernyataan_url',
    ];

    protected function casts(): array
    {
        return [
            // "keahlian" disimpan sebagai daftar (bisa nambah beberapa),
            // BUKAN 1 blok teks — lihat BiodataTab.jsx.
            'keahlian' => 'array',
            'sertifikat' => 'array',
        ];
    }

    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto ? '/storage/' . $this->foto : null;
    }

    public function getKtpUrlAttribute(): ?string
    {
        return $this->ktp ? '/storage/' . $this->ktp : null;
    }

    public function getCvUrlAttribute(): ?string
    {
        return $this->cv ? '/storage/' . $this->cv : null;
    }

    // Berkas persyaratan pendaftaran (pelengkap "buku induk", disalin dari
    // berkas PPDB kalau siswa berasal dari jalur PPDB — lihat
    // PpdbController::buatSiswaDariPendaftar()) atau diunggah manual admin
    // lewat uploadBerkas(). Path relatif, pola sama seperti foto/ktp/cv.
    public function getBerkasIjazahUrlAttribute(): ?string { return $this->berkas_ijazah ? '/storage/' . $this->berkas_ijazah : null; }
    public function getBerkasSkhuUrlAttribute(): ?string { return $this->berkas_skhu ? '/storage/' . $this->berkas_skhu : null; }
    public function getBerkasRapotUrlAttribute(): ?string { return $this->berkas_rapot ? '/storage/' . $this->berkas_rapot : null; }
    public function getBerkasSkkbUrlAttribute(): ?string { return $this->berkas_skkb ? '/storage/' . $this->berkas_skkb : null; }
    public function getBerkasAktaLahirUrlAttribute(): ?string { return $this->berkas_akta_lahir ? '/storage/' . $this->berkas_akta_lahir : null; }
    public function getBerkasKkUrlAttribute(): ?string { return $this->berkas_kk ? '/storage/' . $this->berkas_kk : null; }
    public function getBerkasKipUrlAttribute(): ?string { return $this->berkas_kip ? '/storage/' . $this->berkas_kip : null; }
    public function getBerkasFormulirPendaftaranUrlAttribute(): ?string { return $this->berkas_formulir_pendaftaran ? '/storage/' . $this->berkas_formulir_pendaftaran : null; }
    public function getBerkasPernyataanUrlAttribute(): ?string { return $this->berkas_pernyataan ? '/storage/' . $this->berkas_pernyataan : null; }

    /**
     * "sertifikat" mentah cuma berisi path file — tambahkan url siap-pakai
     * per item supaya frontend tidak perlu membangun path sendiri.
     */
    public function getSertifikatListAttribute(): array
    {
        return collect($this->sertifikat ?? [])
            ->map(fn ($s) => [...$s, 'url' => '/storage/' . $s['file']])
            ->values()
            ->all();
    }

    // Dicek sebelum alumni boleh melamar lowongan (JobApplicationController
    // ::store()) — daftar field di sini SENGAJA cuma yang relevan buat
    // lamaran kerja (bukan seluruh Buku Induk), lihat AskUserQuestion di
    // sesi pembuatan fitur ini untuk alasan pemilihannya. Sertifikat TETAP
    // tidak wajib (boleh lebih dari 1 atau tidak sama sekali), tapi KTP &
    // CV sekarang wajib.
    private const FIELD_BIODATA_WAJIB = [
        'nik', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'no_telp', 'agama', 'foto',
        'tinggi_badan', 'berat_badan', 'status_pernikahan', 'keahlian', 'ktp', 'cv',
    ];

    public function getBiodataLengkapAttribute(): bool
    {
        foreach (self::FIELD_BIODATA_WAJIB as $field) {
            if (empty($this->{$field})) {
                return false;
            }
        }
        return true;
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

    public function jobApplications()
    {
        return $this->hasMany(JobApplication::class);
    }

    public function tracerStudy()
    {
        return $this->hasOne(TracerStudy::class);
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
     * sumber lokasi IDUKA + guru pembimbing untuk absensi radius.
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

        // Notifikasi BK (perlu tindak lanjut) + siswa & wali (informasi
        // poin menembus ambang sanksi) — bukan trigger yang sering, aman
        // lazy-load $this->user/parents di sini.
        if ($this->user) {
            NotificationDispatcher::sendMany(User::where('role', 'bk')->get(), 'bk', 'Kejadian sanksi baru', "{$this->user->name} menembus ambang poin sanksi \"{$rule->nama}\" (total {$this->total_poin} poin), perlu ditindaklanjuti.", '/bk');
            NotificationDispatcher::send($this->user, 'sanksi', 'Poin menembus ambang sanksi', "Poin pelanggaranmu sudah mencapai {$this->total_poin}, kena aturan sanksi \"{$rule->nama}\".", '/siswa');
            NotificationDispatcher::sendMany($this->parents, 'sanksi', 'Poin anak Anda menembus ambang sanksi', "Poin pelanggaran {$this->user->name} sudah mencapai {$this->total_poin}, kena aturan sanksi \"{$rule->nama}\".", '/wali');
        }
    }

    public function tambahPrestasi(int $poin): void
    {
        $this->increment('total_prestasi', $poin);
    }
}
