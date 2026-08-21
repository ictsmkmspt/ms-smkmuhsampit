<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CbtBankSoal;
use App\Models\CbtQuestion;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Bank Soal — wadah bernama di dalam 1 mapel (mis. "Bank Soal UH 1",
 * "Bank Soal UAS"), 1 guru & 1 mapel boleh punya banyak wadah sekaligus.
 * Soal ditulis DI DALAM 1 wadah (lihat CbtQuestionController, subject_id
 * soal selalu mengikuti wadahnya, sama pola seperti Materi mengikuti TP).
 */
class CbtBankSoalController extends Controller
{
    private function ownTeacherId(Request $request): ?int
    {
        return Teacher::where('user_id', $request->user()->id)->value('id');
    }

    private function isOwnSubject(Request $request, int $subjectId): bool
    {
        $teacherId = $this->ownTeacherId($request);
        if (!$teacherId) {
            return false;
        }

        return TeachingAssignment::where('teacher_id', $teacherId)
            ->where('subject_id', $subjectId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->exists();
    }

    public function index(Request $request)
    {
        return CbtBankSoal::where('teacher_id', $this->ownTeacherId($request))
            ->with('subject')
            ->withCount('questions')
            ->orderBy('subject_id')
            ->orderBy('id')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'subject_id' => 'required|exists:subjects,id',
        ]);

        if (!$this->isOwnSubject($request, $data['subject_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 403);
        }

        $data['teacher_id'] = $this->ownTeacherId($request);

        // fresh() WAJIB — 'dibagikan' punya default di level DB (bukan di
        // $attributes model), jadi tanpa reload ulang field ini akan hilang
        // dari respons JSON (bukan false, betul-betul tidak ada key-nya).
        return response()->json(CbtBankSoal::create($data)->fresh(), 201);
    }

    public function update(Request $request, CbtBankSoal $cbtBankSoal)
    {
        if ($cbtBankSoal->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah Bank Soal ini.'], 403);
        }

        $data = $request->validate([
            'nama' => 'required|string|max:150',
        ]);

        $cbtBankSoal->update($data);

        return $cbtBankSoal->fresh();
    }

    public function destroy(Request $request, CbtBankSoal $cbtBankSoal)
    {
        if ($cbtBankSoal->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus Bank Soal ini.'], 403);
        }
        if ($cbtBankSoal->questions()->exists()) {
            return response()->json(['message' => 'Bank Soal ini masih berisi soal — pindahkan atau hapus dulu soal di dalamnya.'], 422);
        }

        $cbtBankSoal->delete();

        return response()->json(['message' => 'Bank Soal dihapus.']);
    }

    /**
     * Bank Soal GURU LAIN yang mengajar mapel yang sama dengan guru ini
     * (team teaching / kelas paralel) — baca-saja, dipakai untuk "meminjam"
     * soal lewat duplikat(), BUKAN untuk mengedit langsung punya guru lain
     * (privasi tetap terjaga, lihat percakapan sebelumnya kenapa Bank Soal
     * sengaja tidak digabung penuh antar guru).
     *
     * SENGAJA cuma menampilkan Bank Soal yang `dibagikan=true` — Bank Soal
     * privat secara default, guru pemiliknya harus menekan tombol "Bagikan"
     * dulu (lihat toggleShare()) baru bisa dilihat guru lain di sini.
     */
    public function lain(Request $request)
    {
        $teacherId = $this->ownTeacherId($request);
        $subjectIds = TeachingAssignment::where('teacher_id', $teacherId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->distinct()
            ->pluck('subject_id');

        return CbtBankSoal::whereIn('subject_id', $subjectIds)
            ->where('teacher_id', '!=', $teacherId)
            ->where('dibagikan', true)
            ->with('subject', 'teacher.user')
            ->withCount('questions')
            ->orderBy('subject_id')
            ->orderBy('id')
            ->get();
    }

    /**
     * Tombol "Bagikan" — guru pemilik yang memutuskan sendiri mau
     * membagikan (atau menyembunyikan lagi) 1 Bank Soal ke guru lain yang
     * mengajar mapel yang sama. Soal di dalamnya sendiri tetap TIDAK bisa
     * diedit langsung oleh guru lain, cuma dilihat & diduplikat sebagian
     * (lihat lain()/soalLain()/duplikat()).
     */
    public function toggleShare(Request $request, CbtBankSoal $cbtBankSoal)
    {
        if ($cbtBankSoal->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah Bank Soal ini.'], 403);
        }

        $cbtBankSoal->update(['dibagikan' => !$cbtBankSoal->dibagikan]);

        return response()->json([
            'message' => $cbtBankSoal->dibagikan
                ? 'Bank Soal ini sekarang bisa dilihat guru lain yang mengajar mapel yang sama.'
                : 'Bank Soal ini disembunyikan lagi dari guru lain.',
            'dibagikan' => $cbtBankSoal->dibagikan,
        ]);
    }

    /**
     * Isi 1 Bank Soal guru lain (baca-saja) — cuma boleh dilihat kalau
     * mapelnya memang salah satu yang diampu guru yang login DAN bank-nya
     * memang sudah di-share pemiliknya (dibagikan=true). Tanpa cek
     * dibagikan ini, guru lain bisa mengintip isi Bank Soal PRIVAT
     * (belum di-share) cuma dengan menebak bank_id — membatalkan seluruh
     * maksud tombol "Bagikan" yang sengaja privat-by-default.
     */
    public function soalLain(Request $request, CbtBankSoal $cbtBankSoal)
    {
        if (!$this->isOwnSubject($request, $cbtBankSoal->subject_id)) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 403);
        }
        if ($cbtBankSoal->teacher_id !== $this->ownTeacherId($request) && !$cbtBankSoal->dibagikan) {
            return response()->json(['message' => 'Bank Soal ini belum dibagikan pemiliknya.'], 403);
        }

        return response()->json([
            'bank' => $cbtBankSoal->load('subject', 'teacher.user'),
            'questions' => $cbtBankSoal->questions()->orderByDesc('id')->get(),
        ]);
    }

    /**
     * Duplikat SEBAGIAN soal (dipilih guru, bukan seluruh isi wadah) dari
     * Bank Soal guru lain (atau punya sendiri) jadi Bank Soal BARU milik
     * guru yang login — supaya bisa "meminjam" soal tanpa bisa mengubah
     * bank asalnya, dan tanpa terpaksa menduplikat semua soal kalau cuma
     * butuh beberapa. File audio (kalau ada) ikut disalin ke path baru
     * (bukan cuma menyalin nama filenya) — supaya kalau salah satu soal
     * hasil duplikat nanti dihapus, itu tidak ikut menghapus file audio
     * milik soal asal guru lain.
     */
    public function duplikat(Request $request)
    {
        $data = $request->validate([
            'bank_id' => 'required|exists:cbt_bank_soal,id',
            'question_ids' => 'required|array|min:1',
            'question_ids.*' => 'required|exists:cbt_questions,id',
            'nama_bank_baru' => 'required|string|max:150',
        ]);

        $sumberBank = CbtBankSoal::findOrFail($data['bank_id']);
        if (!$this->isOwnSubject($request, $sumberBank->subject_id)) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 403);
        }
        if ($sumberBank->teacher_id !== $this->ownTeacherId($request) && !$sumberBank->dibagikan) {
            return response()->json(['message' => 'Bank Soal ini belum dibagikan pemiliknya.'], 403);
        }

        $soalTerpilih = CbtQuestion::where('bank_id', $sumberBank->id)
            ->whereIn('id', $data['question_ids'])
            ->get();
        if ($soalTerpilih->count() !== count($data['question_ids'])) {
            return response()->json(['message' => 'Ada soal yang dipilih bukan bagian dari Bank Soal ini.'], 422);
        }

        $teacherId = $this->ownTeacherId($request);

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
