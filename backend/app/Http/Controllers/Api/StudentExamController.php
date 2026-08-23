<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HitungSkorCbt;
use App\Http\Controllers\Controller;
use App\Models\CbtExam;
use App\Models\CbtExamAnswer;
use App\Models\CbtExamAttempt;
use App\Models\CbtQuestion;
use App\Models\CbtTabSwitchLog;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentExamController extends Controller
{
    use HitungSkorCbt;

    private function ownStudent(Request $request): ?Student
    {
        return Student::where('user_id', $request->user()->id)->first();
    }

    /**
     * Susun urutan soal acak + pemetaan huruf tampilan->huruf asli per
     * soal, dibuat sekali saat attempt dibuat dan disimpan (bukan diacak
     * ulang tiap request) supaya stabil kalau halaman di-refresh —
     * mengurangi siswa saling contek lewat urutan/posisi yang sama persis.
     * Soal essay tidak punya pilihan sama sekali jadi dilewati; jumlah
     * huruf yang diacak ikut soal (4 huruf kalau pilihan_e kosong, 5
     * kalau terisi) — bukan selalu A-D.
     */
    private function generateSoalAcak(CbtExam $exam): array
    {
        $examQuestions = $exam->examQuestions()->with('question')->orderBy('urutan')->get();
        $urutanAcak = $examQuestions->pluck('question_id')->all();
        shuffle($urutanAcak);

        $opsi = [];
        foreach ($examQuestions as $eq) {
            if ($eq->question->tipe === 'essay') {
                continue;
            }
            $huruf = $eq->question->pilihan_e ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
            shuffle($huruf);
            $opsi[$eq->question_id] = $huruf;
        }

        return ['urutan' => $urutanAcak, 'opsi' => $opsi];
    }

    /**
     * Attempt yang device_token-nya kosong (dibuat sebelum fitur ini ada)
     * dianggap tidak dikunci. Kalau sudah ada, request wajib menyertakan
     * token yang sama persis — dipakai buat menutup 1 attempt cuma bisa
     * diakses dari perangkat/browser yang pertama kali membukanya.
     */
    private function checkDeviceToken(Request $request, CbtExamAttempt $attempt): bool
    {
        if (!$attempt->device_token) {
            return true;
        }

        return $request->input('device_token') === $attempt->device_token;
    }

    public function myAttempts(Request $request)
    {
        $student = $this->ownStudent($request);
        if (!$student) {
            return response()->json([]);
        }

        // skor disamarkan (null) selama belum boleh dilihat (ujian yang
        // belum dipublikasikan) — sama seperti gerbang di show(), supaya
        // tab "Nilai" tidak jadi jalan pintas lihat skor sebelum
        // waktunya.
        return CbtExamAttempt::with('exam.subject')
            ->where('student_id', $student->id)
            ->orderByDesc('started_at')
            ->get()
            ->map(function ($attempt) {
                if ($attempt->status === 'submitted' && !$attempt->exam->nilaiBolehDilihatSiswa()) {
                    $attempt->skor = null;
                }

                return $attempt;
            });
    }

    /**
     * Daftar latihan yang terbuka untuk kelas siswa ini, lintas mapel,
     * plus skor terbaik yang pernah dicapai (kalau ada) — tanpa token,
     * cukup tampil begitu guru menerbitkannya.
     */
    public function myLatihan(Request $request)
    {
        $student = $this->ownStudent($request);
        if (!$student) {
            return response()->json([]);
        }

        $latihan = CbtExam::whereHas('classRooms', fn ($q) => $q->where('class_rooms.id', $student->class_room_id))
            ->where('tipe', 'latihan')
            ->where('status', 'terbuka')
            ->with('subject')
            ->withCount('examQuestions')
            ->orderBy('nama')
            ->get();

        $terbaik = CbtExamAttempt::where('student_id', $student->id)
            ->where('status', 'submitted')
            ->whereIn('exam_id', $latihan->pluck('id'))
            ->selectRaw('exam_id, MAX(skor) as skor_terbaik')
            ->groupBy('exam_id')
            ->pluck('skor_terbaik', 'exam_id');

        return $latihan->map(fn ($exam) => [
            'id' => $exam->id,
            'nama' => $exam->nama,
            'mapel' => $exam->subject->nama,
            'jumlah_soal' => $exam->exam_questions_count,
            'skor_terbaik' => $terbaik[$exam->id] ?? null,
            'durasi_menit' => $exam->durasi_menit,
        ]);
    }

    /**
     * Mulai percobaan baru untuk sebuah latihan — selalu bikin attempt
     * baru (tidak seperti join() yang melanjutkan/menolak attempt lama),
     * karena latihan sengaja boleh dikerjakan berkali-kali.
     */
    public function startLatihan(Request $request, CbtExam $cbtExam)
    {
        $student = $this->ownStudent($request);
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        if ($cbtExam->tipe !== 'latihan') {
            return response()->json(['message' => 'Ujian ini bukan latihan.'], 422);
        }
        if (!$cbtExam->classRooms()->where('class_rooms.id', $student->class_room_id)->exists()) {
            return response()->json(['message' => 'Latihan ini bukan untuk kelas Anda.'], 403);
        }
        if ($cbtExam->status !== 'terbuka') {
            return response()->json(['message' => 'Latihan ini belum atau sudah tidak bisa diakses.'], 422);
        }

        $attempt = CbtExamAttempt::create([
            'exam_id' => $cbtExam->id,
            'student_id' => $student->id,
            'status' => 'in_progress',
            'started_at' => now(),
            'soal_acak' => $this->generateSoalAcak($cbtExam),
            'device_token' => Str::random(40),
        ]);

        return response()->json(['attempt_id' => $attempt->id, 'device_token' => $attempt->device_token], 201);
    }

    /**
     * Intip info ujian dari token TANPA bikin attempt — dipakai layar
     * konfirmasi sebelum siswa benar-benar menekan "Mulai Sekarang", supaya
     * waktu baca aturan tidak ikut memotong durasi ujian (attempt & timer
     * baru dibuat di join()).
     */
    public function previewToken(Request $request)
    {
        $data = $request->validate(['token' => 'required|string']);

        $student = $this->ownStudent($request);
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        $exam = CbtExam::where('token', strtoupper($data['token']))->first();
        if (!$exam || $exam->tipe === 'latihan' || !$exam->classRooms()->where('class_rooms.id', $student->class_room_id)->exists()) {
            return response()->json(['message' => 'Token ujian tidak ditemukan.'], 404);
        }

        $existing = CbtExamAttempt::where('exam_id', $exam->id)->where('student_id', $student->id)->first();
        if ($existing && $existing->status === 'submitted') {
            return response()->json(['message' => 'Anda sudah mengerjakan ujian ini.'], 422);
        }
        if (!$existing && !$exam->isOpenForAttempt()) {
            return response()->json(['message' => 'Ujian ini belum dibuka atau sudah tidak bisa diakses.'], 422);
        }

        return response()->json([
            'token' => $exam->token,
            'nama' => $exam->nama,
            'mapel' => $exam->subject->nama,
            'jumlah_soal' => $exam->examQuestions()->count(),
            'durasi_menit' => $exam->durasi_menit,
            'sedang_berlangsung' => (bool) $existing,
        ]);
    }

    public function join(Request $request)
    {
        $data = $request->validate(['token' => 'required|string']);

        $student = $this->ownStudent($request);
        if (!$student) {
            return response()->json(['message' => 'Profil siswa tidak ditemukan.'], 404);
        }

        $exam = CbtExam::where('token', strtoupper($data['token']))->first();

        // Pesan generik yang sama baik token salah maupun token benar tapi
        // untuk kelas lain — supaya siswa tidak bisa menebak-nebak token
        // kelas lain valid atau tidak dari beda pesan error.
        if (!$exam || !$exam->classRooms()->where('class_rooms.id', $student->class_room_id)->exists()) {
            return response()->json(['message' => 'Token ujian tidak ditemukan.'], 404);
        }

        if ($exam->tipe === 'latihan') {
            return response()->json(['message' => 'Latihan tidak perlu token, buka dari menu Latihan.'], 422);
        }

        $existing = CbtExamAttempt::where('exam_id', $exam->id)->where('student_id', $student->id)->first();
        if ($existing) {
            if ($existing->status === 'submitted') {
                return response()->json(['message' => 'Anda sudah mengerjakan ujian ini.'], 422);
            }
            return response()->json(['attempt_id' => $existing->id]);
        }

        if (!$exam->isOpenForAttempt()) {
            return response()->json(['message' => 'Ujian ini belum dibuka atau sudah tidak bisa diakses.'], 422);
        }

        // Tabel cbt_exam_attempts SENGAJA tidak lagi punya unique constraint
        // exam_id+student_id (dihapus supaya latihan bisa dikerjakan
        // berkali-kali) — jadi window TOCTOU antara cek $existing di atas
        // dan create() di bawah HARUS ditutup lewat row-lock, bukan
        // mengandalkan constraint DB seperti sebelumnya. Kunci baris
        // Student (pola sama seperti PklPlacementController) supaya 2
        // request join() nyaris bersamaan untuk siswa+ujian yang sama
        // (dobel klik, 2 tab) diserialisasi — request kedua akan melihat
        // attempt yang baru dibuat request pertama begitu lock-nya lepas.
        $deviceToken = Str::random(40);

        $attempt = DB::transaction(function () use ($exam, $student, $deviceToken) {
            Student::where('id', $student->id)->lockForUpdate()->first();

            $existing = CbtExamAttempt::where('exam_id', $exam->id)->where('student_id', $student->id)->first();
            if ($existing) {
                return $existing;
            }

            return CbtExamAttempt::create([
                'exam_id' => $exam->id,
                'student_id' => $student->id,
                'status' => 'in_progress',
                'started_at' => now(),
                'soal_acak' => $this->generateSoalAcak($exam),
                'device_token' => $deviceToken,
            ]);
        });

        // Kalau attempt yang dikembalikan sudah ada SEBELUM transaksi ini
        // (request lain menang race-nya), jangan ikut kembalikan
        // device_token — biar request ini tidak "mencuri" kunci perangkat
        // dari sesi yang sudah berjalan duluan.
        if ($attempt->wasRecentlyCreated) {
            return response()->json(['attempt_id' => $attempt->id, 'device_token' => $deviceToken], 201);
        }

        if ($attempt->status === 'submitted') {
            return response()->json(['message' => 'Anda sudah mengerjakan ujian ini.'], 422);
        }

        return response()->json(['attempt_id' => $attempt->id]);
    }

    public function show(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        $student = $this->ownStudent($request);
        if (!$student || $cbtExamAttempt->student_id !== $student->id) {
            return response()->json(['message' => 'Anda tidak berwenang melihat ujian ini.'], 403);
        }
        // Kunci perangkat cuma berlaku selagi masih dikerjakan — setelah
        // submit, melihat skor/pembahasan sendiri dari perangkat lain
        // (mis. cek nilai lewat HP setelah ujian di lab) tidak masalah.
        if ($cbtExamAttempt->status === 'in_progress' && !$this->checkDeviceToken($request, $cbtExamAttempt)) {
            return response()->json(['message' => 'Ujian ini sedang dikerjakan di perangkat/browser lain.'], 403);
        }

        $exam = $cbtExamAttempt->exam()->with('subject')->first();

        // Latihan SEKARANG juga punya batas waktu sungguhan, sama seperti
        // ujian (durasi_menit selalu diisi & dipakai untuk kedua tipe) —
        // yang beda cuma latihan tidak punya jadwal_mulai/jadwal_selesai
        // yang berarti (diisi rentang sangat lebar di belakang layar oleh
        // frontend, lihat rentangLebarLatihan() di BuatUjianSubTab.jsx).
        if ($cbtExamAttempt->status === 'in_progress') {
            $deadline = $cbtExamAttempt->started_at->copy()->addMinutes($exam->durasi_menit + $cbtExamAttempt->extra_minutes);
            if (now()->greaterThanOrEqualTo($deadline)) {
                $this->finalisasiAttempt($cbtExamAttempt);
                $cbtExamAttempt->refresh();
            }
        }

        // Soal & pilihan jawaban ditampilkan sesuai urutan acak yang sudah
        // dibuat & disimpan saat attempt ini dibuat (soal_acak) — bukan
        // urutan asli exam — supaya tiap siswa dapat susunan berbeda.
        // Attempt lama sebelum fitur ini ada (soal_acak null) jatuh balik
        // ke urutan asli + huruf apa adanya, tidak diacak.
        $questionsById = $exam->examQuestions()->with('question')->get()->keyBy('question_id');
        $soalAcak = $cbtExamAttempt->soal_acak ?? [
            'urutan' => $questionsById->keys()->all(),
            'opsi' => [],
        ];

        $questions = collect($soalAcak['urutan'])->values()->map(function ($qid, $idx) use ($questionsById, $soalAcak) {
            $q = $questionsById[$qid]->question;
            $isEssay = $q->tipe === 'essay';
            $map = $soalAcak['opsi'][$qid] ?? ($q->pilihan_e ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D']);

            $item = [
                'id' => $q->id,
                'urutan' => $idx + 1,
                'tipe' => $q->tipe,
                'tingkat_kesulitan' => $q->tingkat_kesulitan,
                'pertanyaan' => $q->pertanyaan,
                'audio_url' => $q->audio_url,
            ];

            if (!$isEssay) {
                foreach ($map as $posisi => $hurufAsli) {
                    $item['pilihan_'.strtolower(chr(65 + $posisi))] = $q->{'pilihan_'.strtolower($hurufAsli)};
                }
                $item['opsi_map'] = $map;
            }

            return $item;
        });

        // jawaban_dipilih (pg) & jawaban_essay (essay) sama-sama dikirim —
        // frontend tinggal pakai yang relevan sesuai tipe soalnya.
        $jawaban = $cbtExamAttempt->answers()->get(['question_id', 'jawaban_dipilih', 'jawaban_essay'])
            ->mapWithKeys(fn ($a) => [$a->question_id => ['jawaban_dipilih' => $a->jawaban_dipilih, 'jawaban_essay' => $a->jawaban_essay]]);

        $remainingSeconds = null;
        if ($cbtExamAttempt->status === 'in_progress') {
            $deadline = $cbtExamAttempt->started_at->copy()->addMinutes($exam->durasi_menit + $cbtExamAttempt->extra_minutes);
            $remainingSeconds = max(0, $deadline->timestamp - now()->timestamp);
        }

        $bolehLihatNilai = $exam->nilaiBolehDilihatSiswa();

        $review = null;
        if ($cbtExamAttempt->status === 'submitted' && $bolehLihatNilai) {
            $review = $cbtExamAttempt->answers()->with('question')->get()->map(fn ($a) => [
                'question_id' => $a->question_id,
                'tipe' => $a->question->tipe,
                'tingkat_kesulitan' => $a->question->tingkat_kesulitan,
                'pertanyaan' => $a->question->pertanyaan,
                'audio_url' => $a->question->audio_url,
                'jawaban_dipilih' => $a->jawaban_dipilih,
                'jawaban_benar' => $a->question->jawaban_benar,
                'is_correct' => $a->is_correct,
                'jawaban_essay' => $a->jawaban_essay,
                'nilai_essay' => $a->nilai_essay,
                'status_koreksi' => $a->status_koreksi,
            ]);
        }

        return response()->json([
            'attempt' => [
                'id' => $cbtExamAttempt->id,
                'status' => $cbtExamAttempt->status,
                // Skor cuma ditampilkan begitu boleh dilihat (latihan
                // selalu, ujian nunggu dipublikasikan) — supaya siswa
                // tidak lihat angka lewat attempt.skor sebelum waktunya
                // padahal review-nya sendiri sengaja disembunyikan.
                'skor' => ($cbtExamAttempt->status === 'submitted' && $bolehLihatNilai) ? $cbtExamAttempt->skor : null,
                'tab_switch_count' => $cbtExamAttempt->tab_switch_count,
            ],
            'exam' => [
                'id' => $exam->id,
                'nama' => $exam->nama,
                'mapel' => $exam->subject->nama,
                'durasi_menit' => $exam->durasi_menit,
                'kkm' => $exam->kkm,
                'status' => $exam->status,
                'status_publikasi' => $exam->status_publikasi,
                'tipe' => $exam->tipe,
            ],
            'questions' => $questions,
            'jawaban' => $jawaban,
            'remaining_seconds' => $remainingSeconds,
            'nilai_dipublikasikan' => $bolehLihatNilai,
            'review' => $review,
        ]);
    }

    public function saveAnswer(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        $student = $this->ownStudent($request);
        if (!$student || $cbtExamAttempt->student_id !== $student->id) {
            return response()->json(['message' => 'Anda tidak berwenang mengisi ujian ini.'], 403);
        }
        if (!$this->checkDeviceToken($request, $cbtExamAttempt)) {
            return response()->json(['message' => 'Ujian ini sedang dikerjakan di perangkat/browser lain.'], 403);
        }

        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Ujian ini sudah selesai dikerjakan.'], 422);
        }

        $deadline = $cbtExamAttempt->started_at->copy()->addMinutes($cbtExamAttempt->exam->durasi_menit + $cbtExamAttempt->extra_minutes);
        if (now()->greaterThanOrEqualTo($deadline)) {
            $this->finalisasiAttempt($cbtExamAttempt);
            return response()->json(['message' => 'Waktu ujian sudah habis.'], 422);
        }

        $data = $request->validate([
            'question_id' => 'required|exists:cbt_questions,id',
            'jawaban_dipilih' => 'nullable|in:A,B,C,D,E',
            'jawaban_essay' => 'nullable|string|max:20000',
        ]);

        $belongs = $cbtExamAttempt->exam->examQuestions()->where('question_id', $data['question_id'])->exists();
        if (!$belongs) {
            return response()->json(['message' => 'Soal ini bukan bagian dari ujian ini.'], 422);
        }

        $question = CbtQuestion::find($data['question_id']);

        if ($question->tipe === 'essay') {
            CbtExamAnswer::updateOrCreate(
                ['attempt_id' => $cbtExamAttempt->id, 'question_id' => $data['question_id']],
                ['jawaban_essay' => $data['jawaban_essay'] ?? null]
            );
        } else {
            $isCorrect = $data['jawaban_dipilih'] !== null ? $data['jawaban_dipilih'] === $question->jawaban_benar : null;
            CbtExamAnswer::updateOrCreate(
                ['attempt_id' => $cbtExamAttempt->id, 'question_id' => $data['question_id']],
                ['jawaban_dipilih' => $data['jawaban_dipilih'] ?? null, 'is_correct' => $isCorrect]
            );
        }

        return response()->json(['message' => 'Tersimpan.']);
    }

    public function submit(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        $student = $this->ownStudent($request);
        if (!$student || $cbtExamAttempt->student_id !== $student->id) {
            return response()->json(['message' => 'Anda tidak berwenang mengumpulkan ujian ini.'], 403);
        }
        if (!$this->checkDeviceToken($request, $cbtExamAttempt)) {
            return response()->json(['message' => 'Ujian ini sedang dikerjakan di perangkat/browser lain.'], 403);
        }

        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Ujian ini sudah dikumpulkan sebelumnya.'], 422);
        }

        $this->finalisasiAttempt($cbtExamAttempt);

        return $cbtExamAttempt->fresh();
    }

    public function logTabSwitch(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        $student = $this->ownStudent($request);
        if (!$student || $cbtExamAttempt->student_id !== $student->id) {
            return response()->json(['message' => 'Tidak berwenang.'], 403);
        }
        if (!$this->checkDeviceToken($request, $cbtExamAttempt)) {
            return response()->json(['message' => 'Ujian ini sedang dikerjakan di perangkat/browser lain.'], 403);
        }

        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Ujian sudah selesai.'], 422);
        }

        $data = $request->validate([
            'event_type' => 'required|in:visibility_hidden,blur,fullscreen_exit',
        ]);

        CbtTabSwitchLog::create(['attempt_id' => $cbtExamAttempt->id, 'event_type' => $data['event_type']]);
        $cbtExamAttempt->increment('tab_switch_count');

        return response()->json(['message' => 'Dicatat.']);
    }
}
