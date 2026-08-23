<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\CbtExamAttempt;

/**
 * Perhitungan skor CBT berbobot — dipakai bersama 3 tempat: siswa submit
 * sendiri (StudentExamController), guru paksa-hentikan sesi macet
 * (CbtExamController), dan setiap kali guru simpan nilai essay
 * (CbtEssayController, skor bisa NAIK belakangan setelah dikoreksi manual,
 * makanya recompute-nya dipisah dari "submit" — attempt yang statusnya
 * sudah submitted pun skornya masih bisa diperbarui).
 */
trait HitungSkorCbt
{
    /**
     * $examQuestions opsional — kalau pemanggil sudah punya soal exam-nya
     * di tangan (mis. finalisasi banyak attempt sekaligus untuk 1 exam yang
     * sama, lihat hentikanSemua()), teruskan supaya tidak query ulang
     * exam+examQuestions+question untuk tiap attempt padahal soalnya identik.
     */
    private function hitungSkorAttempt(CbtExamAttempt $attempt, ?\Illuminate\Support\Collection $examQuestions = null): float
    {
        $examQuestions ??= $attempt->exam->examQuestions()->with('question')->get();
        $totalBobot = $examQuestions->sum(fn ($eq) => $eq->question->bobot);
        if ($totalBobot === 0) {
            return 0;
        }

        $jawabanByQuestionId = $attempt->relationLoaded('answers') ? $attempt->answers->keyBy('question_id') : $attempt->answers()->get()->keyBy('question_id');

        $tercapai = $examQuestions->sum(function ($eq) use ($jawabanByQuestionId) {
            $jawab = $jawabanByQuestionId->get($eq->question_id);
            if (!$jawab) {
                return 0;
            }
            if ($eq->question->tipe === 'essay') {
                // Essay selalu dikoreksi 0-100 (lihat CbtEssayController)
                // terlepas dari tingkat kesulitannya — dinormalisasi ke
                // bobot soal ini baru dijumlahkan, sama seperti PG yang
                // menyumbang bobot penuh kalau benar.
                return ((int) ($jawab->nilai_essay ?? 0)) / 100 * $eq->question->bobot;
            }

            return $jawab->is_correct ? $eq->question->bobot : 0;
        });

        return round(100 * $tercapai / $totalBobot, 2);
    }

    private function finalisasiAttempt(CbtExamAttempt $attempt, ?\Illuminate\Support\Collection $examQuestions = null): void
    {
        if ($attempt->status !== 'in_progress') {
            return;
        }

        $attempt->update([
            'status' => 'submitted',
            'submitted_at' => now(),
            'skor' => $this->hitungSkorAttempt($attempt, $examQuestions),
        ]);
    }

    private function perbaruiSkorAttempt(CbtExamAttempt $attempt): void
    {
        $attempt->update(['skor' => $this->hitungSkorAttempt($attempt)]);
    }
}
