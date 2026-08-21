<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HitungSkorCbt;
use App\Http\Controllers\Controller;
use App\Models\CbtExam;
use App\Models\CbtExamAnswer;
use App\Models\CbtExamAttempt;
use Illuminate\Http\Request;

/**
 * Koreksi Essay — versi Admin/Waka Kurikulum, mirip CbtEssayController tapi
 * tanpa pengecekan kepemilikan (rute sudah digerbangi role:admin,
 * waka_kurikulum — admin boleh mengoreksi essay ujian guru manapun).
 */
class AdminCbtEssayController extends Controller
{
    use HitungSkorCbt;

    public function koreksi(CbtExam $cbtExam)
    {
        $totalEssay = $cbtExam->examQuestions()->whereHas('question', fn ($q) => $q->where('tipe', 'essay'))->count();

        $attempts = $cbtExam->attempts()
            ->where('status', 'submitted')
            ->with('student.user', 'student.classRoom')
            ->get()
            ->map(function ($attempt) use ($totalEssay) {
                $sudahDinilai = $attempt->answers()->where('status_koreksi', 'sudah')->count();

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

    public function koreksiSiswa(CbtExam $cbtExam, CbtExamAttempt $cbtExamAttempt)
    {
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

    public function simpanNilai(Request $request, CbtExamAnswer $cbtExamAnswer)
    {
        $cbtExamAnswer->load('attempt.exam', 'question');

        if ($cbtExamAnswer->question->tipe !== 'essay') {
            return response()->json(['message' => 'Soal ini bukan essay.'], 422);
        }

        $data = $request->validate([
            'nilai' => 'required|integer|min:0|max:100',
        ]);

        $cbtExamAnswer->update(['nilai_essay' => $data['nilai'], 'status_koreksi' => 'sudah']);
        $this->perbaruiSkorAttempt($cbtExamAnswer->attempt);

        return response()->json(['message' => 'Nilai tersimpan.', 'skor_attempt' => $cbtExamAnswer->attempt->fresh()->skor]);
    }
}
