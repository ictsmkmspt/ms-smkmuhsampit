<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HitungSkorCbt;
use App\Http\Controllers\Controller;
use App\Models\CbtExam;
use App\Models\CbtExamAnswer;
use App\Models\CbtExamAttempt;
use App\Models\Teacher;
use Illuminate\Http\Request;

/**
 * Koreksi manual soal essay — soal pilihan ganda otomatis dinilai saat
 * siswa submit (lihat StudentExamController), tapi essay butuh guru baca
 * & kasih nilai satu-satu. Alur: pilih ujian yang punya soal essay -> pilih
 * siswa yang sudah submit -> baca & nilai tiap jawaban essaynya -> skor
 * total attempt dihitung ulang otomatis (lihat HitungSkorCbt) begitu nilai
 * essay disimpan.
 */
class CbtEssayController extends Controller
{
    use HitungSkorCbt;

    private function ownTeacherId(Request $request): ?int
    {
        return Teacher::where('user_id', $request->user()->id)->value('id');
    }

    /**
     * Daftar siswa yang sudah submit untuk 1 ujian, plus progres koreksi
     * (berapa dari total jawaban essay-nya yang sudah dinilai).
     */
    public function koreksi(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data ujian ini.'], 403);
        }

        $totalEssay = $cbtExam->examQuestions()->whereHas('question', fn ($q) => $q->where('tipe', 'essay'))->count();

        $attempts = $cbtExam->attempts()
            ->where('status', 'submitted')
            ->with('student.user', 'student.classRoom')
            ->withCount(['answers as sudah_dinilai_count' => fn ($q) => $q->where('status_koreksi', 'sudah')])
            ->get()
            ->map(function ($attempt) use ($totalEssay) {
                $sudahDinilai = $attempt->sudah_dinilai_count;

                return [
                    'attempt_id' => $attempt->id,
                    'student' => $attempt->student,
                    'skor' => $attempt->skor,
                    'total_essay' => $totalEssay,
                    'sudah_dinilai' => $sudahDinilai,
                    'selesai_dikoreksi' => $totalEssay > 0 && $sudahDinilai >= $totalEssay,
                ];
            })
            ->sortBy(fn ($a) => $a['student']->user?->name)
            ->values();

        return response()->json(['exam' => $cbtExam->load('subject'), 'total_essay' => $totalEssay, 'siswa' => $attempts]);
    }

    /**
     * Form koreksi 1 siswa — semua jawaban essay-nya untuk ujian ini.
     */
    public function koreksiSiswa(Request $request, CbtExam $cbtExam, CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data ujian ini.'], 403);
        }
        if ($cbtExamAttempt->exam_id !== $cbtExam->id) {
            abort(404);
        }

        $jawaban = $cbtExamAttempt->answers()
            ->whereHas('question', fn ($q) => $q->where('tipe', 'essay'))
            ->with('question')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'pertanyaan' => $a->question->pertanyaan,
                'audio_url' => $a->question->audio_url,
                'tingkat_kesulitan' => $a->question->tingkat_kesulitan,
                'jawaban_essay' => $a->jawaban_essay,
                'nilai_essay' => $a->nilai_essay,
                'status_koreksi' => $a->status_koreksi,
            ]);

        return response()->json([
            'exam' => $cbtExam->load('subject'),
            'student' => $cbtExamAttempt->student()->with('user', 'classRoom')->first(),
            'jawaban' => $jawaban,
        ]);
    }

    /**
     * Simpan nilai 1 jawaban essay — skor total attempt langsung dihitung
     * ulang (bisa NAIK dari 0 begitu essay pertama dinilai), supaya guru
     * lain / siswa (kalau nilai sudah dipublikasikan) selalu lihat angka
     * terbaru tanpa perlu aksi tambahan.
     */
    public function simpanNilai(Request $request, CbtExamAnswer $cbtExamAnswer)
    {
        $cbtExamAnswer->load('attempt.exam', 'question');

        if ($cbtExamAnswer->attempt->exam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menilai jawaban ini.'], 403);
        }
        if ($cbtExamAnswer->question->tipe !== 'essay') {
            return response()->json(['message' => 'Soal ini bukan essay.'], 422);
        }

        // Essay selalu dinilai 0-100 terlepas dari tingkat kesulitannya —
        // dinormalisasi ke bobot soal ini saat hitung skor total, lihat
        // HitungSkorCbt::hitungSkorAttempt().
        $data = $request->validate([
            'nilai' => 'required|integer|min:0|max:100',
        ]);

        $cbtExamAnswer->update(['nilai_essay' => $data['nilai'], 'status_koreksi' => 'sudah']);
        $this->perbaruiSkorAttempt($cbtExamAnswer->attempt);

        return response()->json(['message' => 'Nilai tersimpan.', 'skor_attempt' => $cbtExamAnswer->attempt->fresh()->skor]);
    }
}
