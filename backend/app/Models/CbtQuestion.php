<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class CbtQuestion extends Model
{
    protected $fillable = [
        'subject_id', 'teacher_id', 'tahun_ajaran_id', 'bank_id', 'tipe', 'pertanyaan',
        'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'pilihan_e',
        'jawaban_benar', 'tingkat_kesulitan', 'audio_path',
    ];

    // 'bobot' WAJIB ikut di-append — bukan kolom DB asli lagi (dihitung
    // dari tingkat_kesulitan), jadi tanpa ini tidak akan muncul di JSON
    // saat model di-return/di-serialize langsung (mis. CbtQuestionController
    // ::index()), padahal frontend & controller lain masih baca $q->bobot.
    protected $appends = ['audio_url', 'bobot'];

    /**
     * Bobot bukan lagi angka bebas yang diisi guru — dipetakan tetap dari
     * tingkat_kesulitan supaya guru tinggal pilih Mudah/Sedang/Sulit tanpa
     * perlu menentukan angka spesifik. Dipertahankan sebagai accessor
     * (bukan mengganti semua pemakaian $question->bobot di kode lain)
     * supaya rumus skor proporsional yang sudah ada (HitungSkorCbt) &
     * tempat lain yang membaca ->bobot tetap jalan tanpa perubahan.
     */
    public const BOBOT_MAP = ['mudah' => 1, 'sedang' => 2, 'sulit' => 3];

    protected function bobot(): Attribute
    {
        return Attribute::get(fn () => self::BOBOT_MAP[$this->tingkat_kesulitan] ?? self::BOBOT_MAP['sedang']);
    }

    protected static function booted(): void
    {
        static::creating(function (CbtQuestion $question) {
            if (empty($question->tahun_ajaran_id)) {
                $question->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function getAudioUrlAttribute(): ?string
    {
        return $this->audio_path ? '/storage/'.$this->audio_path : null;
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function bank()
    {
        return $this->belongsTo(CbtBankSoal::class, 'bank_id');
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
        return $this->hasMany(CbtExamQuestion::class, 'question_id');
    }
}
