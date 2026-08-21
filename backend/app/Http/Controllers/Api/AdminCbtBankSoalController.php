<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CbtBankSoal;
use App\Models\CbtQuestion;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Bank Soal — versi Admin/Waka Kurikulum, lihat AdminCbtQuestionController
 * untuk penjelasan kenapa teacher_id datang eksplisit dari request.
 */
class AdminCbtBankSoalController extends Controller
{
    private function teacherPunyaMapel(int $teacherId, int $subjectId): bool
    {
        return TeachingAssignment::where('teacher_id', $teacherId)
            ->where('subject_id', $subjectId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->exists();
    }

    public function index(Request $request)
    {
        $data = $request->validate(['teacher_id' => 'required|exists:teachers,id']);

        return CbtBankSoal::where('teacher_id', $data['teacher_id'])
            ->with('subject')
            ->withCount('questions')
            ->orderBy('subject_id')
            ->orderBy('id')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'nama' => 'required|string|max:150',
            'subject_id' => 'required|exists:subjects,id',
        ]);

        if (!$this->teacherPunyaMapel($data['teacher_id'], $data['subject_id'])) {
            return response()->json(['message' => 'Guru ini tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 422);
        }

        return response()->json(CbtBankSoal::create($data), 201);
    }

    public function update(Request $request, CbtBankSoal $cbtBankSoal)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:150',
        ]);

        $cbtBankSoal->update($data);

        return $cbtBankSoal->fresh();
    }

    public function destroy(CbtBankSoal $cbtBankSoal)
    {
        if ($cbtBankSoal->questions()->exists()) {
            return response()->json(['message' => 'Bank Soal ini masih berisi soal — pindahkan atau hapus dulu soal di dalamnya.'], 422);
        }

        $cbtBankSoal->delete();

        return response()->json(['message' => 'Bank Soal dihapus.']);
    }

    public function toggleShare(CbtBankSoal $cbtBankSoal)
    {
        $cbtBankSoal->update(['dibagikan' => !$cbtBankSoal->dibagikan]);

        return response()->json([
            'message' => $cbtBankSoal->dibagikan
                ? 'Bank Soal ini sekarang bisa dilihat guru lain yang mengajar mapel yang sama.'
                : 'Bank Soal ini disembunyikan lagi dari guru lain.',
            'dibagikan' => $cbtBankSoal->dibagikan,
        ]);
    }

    /**
     * Duplikat SEBAGIAN soal (dipilih admin, bukan seluruh isi wadah) dari
     * 1 Bank Soal jadi Bank Soal BARU untuk teacher_id yang sama — lihat
     * CbtBankSoalController::duplikat() (versi guru) untuk alasan
     * lengkapnya. teacher_id di sini eksplisit dari request, wadah sumber
     * & tujuan harus milik guru yang sama.
     */
    public function duplikat(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'bank_id' => 'required|exists:cbt_bank_soal,id',
            'question_ids' => 'required|array|min:1',
            'question_ids.*' => 'required|exists:cbt_questions,id',
            'nama_bank_baru' => 'required|string|max:150',
        ]);

        $sumberBank = CbtBankSoal::where('id', $data['bank_id'])->where('teacher_id', $data['teacher_id'])->first();
        if (!$sumberBank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik guru ini.'], 422);
        }

        $soalTerpilih = CbtQuestion::where('bank_id', $sumberBank->id)
            ->whereIn('id', $data['question_ids'])
            ->get();
        if ($soalTerpilih->count() !== count($data['question_ids'])) {
            return response()->json(['message' => 'Ada soal yang dipilih bukan bagian dari Bank Soal ini.'], 422);
        }

        $teacherId = (int) $data['teacher_id'];

        $bankBaru = DB::transaction(function () use ($soalTerpilih, $sumberBank, $teacherId, $data) {
            $bankBaru = CbtBankSoal::create([
                'teacher_id' => $teacherId,
                'subject_id' => $sumberBank->subject_id,
                'nama' => $data['nama_bank_baru'],
            ]);

            foreach ($soalTerpilih as $soal) {
                $audioPathBaru = null;
                if ($soal->audio_path) {
                    $ext = pathinfo($soal->audio_path, PATHINFO_EXTENSION);
                    $audioPathBaru = 'cbt-soal-audio/'.uniqid('dup_').'.'.$ext;
                    Storage::disk('public')->copy($soal->audio_path, $audioPathBaru);
                }

                CbtQuestion::create([
                    'teacher_id' => $teacherId,
                    'bank_id' => $bankBaru->id,
                    'subject_id' => $sumberBank->subject_id,
                    'tipe' => $soal->tipe,
                    'pertanyaan' => $soal->pertanyaan,
                    'pilihan_a' => $soal->pilihan_a,
                    'pilihan_b' => $soal->pilihan_b,
                    'pilihan_c' => $soal->pilihan_c,
                    'pilihan_d' => $soal->pilihan_d,
                    'pilihan_e' => $soal->pilihan_e,
                    'jawaban_benar' => $soal->jawaban_benar,
                    'tingkat_kesulitan' => $soal->tingkat_kesulitan,
                    'audio_path' => $audioPathBaru,
                ]);
            }

            return $bankBaru;
        });

        return response()->json([
            'message' => count($soalTerpilih).' soal berhasil diduplikat ke Bank Soal "'.$bankBaru->nama.'".',
            'bank' => $bankBaru->fresh()->loadCount('questions'),
        ], 201);
    }
}
