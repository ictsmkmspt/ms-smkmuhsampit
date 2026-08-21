<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CbtExam extends Model
{
    protected $fillable = ['nama', 'subject_id', 'teacher_id', 'tahun_ajaran_id', 'token', 'durasi_menit', 'kkm', 'jadwal_mulai', 'jadwal_selesai', 'status', 'status_publikasi', 'tipe', 'materi_id'];

    protected $casts = [
        'jadwal_mulai' => 'datetime',
        'jadwal_selesai' => 'datetime',
        'status_publikasi' => 'boolean',
    ];

    /**
     * Auto-isi tahun ajaran aktif dan bikin token unik 6 karakter kalau
     * belum diisi manual — pola sama seperti AcademicScore untuk
     * tahun_ajaran_id, token digenerate sistem supaya guru tidak perlu
     * ketik manual (menghindari typo yang membuat siswa gagal masuk).
     */
    protected static function booted(): void
    {
        static::creating(function (CbtExam $exam) {
            if (empty($exam->tahun_ajaran_id)) {
                $exam->tahun_ajaran_id = TahunAjaran::aktifId();
            }
            if (empty($exam->token)) {
                $exam->token = static::generateToken();
            }
        });
    }

    /**
     * Dipakai juga oleh CbtExamController::regenerateToken() — token
     * ujian bisa diganti ulang kalau bocor/salah bagi, bukan cuma sekali
     * dibuat otomatis saat exam dibuat.
     */
    public static function generateToken(): string
    {
        do {
            $token = strtoupper(Str::random(6));
        } while (static::where('token', $token)->exists());

        return $token;
    }

    public function isOpenForAttempt(): bool
    {
        return $this->status === 'terbuka'
            && now()->between($this->jadwal_mulai, $this->jadwal_selesai);
    }

    /**
     * Nilai (skor) siswa cuma boleh dilihat siswa kalau: latihan (selalu
     * langsung kelihatan begitu attempt submitted), atau ujian yang sudah
     * dipublikasikan lewat tombol "Publikasikan Nilai" — dipisah dari
     * status "selesai" supaya guru punya jeda sengaja mengoreksi essay
     * dulu sebelum siswa lihat skor akhirnya.
     */
    public function nilaiBolehDilihatSiswa(): bool
    {
        return $this->tipe === 'latihan' || $this->status_publikasi;
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function classRooms()
    {
        return $this->belongsToMany(ClassRoom::class, 'cbt_exam_class_rooms', 'exam_id', 'class_room_id');
    }

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function examQuestions()
    {
        return $this->hasMany(CbtExamQuestion::class, 'exam_id')->orderBy('urutan');
    }

    public function attempts()
    {
        return $this->hasMany(CbtExamAttempt::class, 'exam_id');
    }

    public function materi()
    {
        return $this->belongsTo(CbtMateri::class, 'materi_id');
    }
}
