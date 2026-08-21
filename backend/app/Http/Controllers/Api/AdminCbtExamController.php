<?php

namespace App\Http\Controllers\Api;

use App\Exports\CbtLaporanNilaiExport;
use App\Http\Controllers\Api\Concerns\HitungSkorCbt;
use App\Http\Controllers\Api\Concerns\LogsCbtExamAudit;
use App\Http\Controllers\Controller;
use App\Models\AcademicScore;
use App\Models\CbtExam;
use App\Models\CbtExamAttempt;
use App\Models\CbtExamQuestion;
use App\Models\CbtMateri;
use App\Models\CbtQuestion;
use App\Models\Student;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Buat Ujian & Jadwal — versi Admin/Waka Kurikulum, mirip
 * AdminCbtQuestionController: teacher_id datang eksplisit dari request
 * (dipilih dulu di menu "Kelola CBT"), bukan dari akun yang login, dan
 * pengecekan kepemilikan (yang di versi guru berfungsi sebagai batas
 * keamanan) dihilangkan karena rute ini memang sudah digerbangi
 * role:admin,waka_kurikulum — admin BOLEH mengelola ujian guru manapun,
 * penuh seperti guru itu sendiri (terbitkan, tutup, hapus, ganti token,
 * publikasikan nilai, hentikan sesi, dst).
 */
class AdminCbtExamController extends Controller
{
    use HitungSkorCbt;
    use LogsCbtExamAudit;

    private function teacherMengajarSemuaKelas(int $teacherId, int $subjectId, array $classRoomIds): bool
    {
        foreach ($classRoomIds as $classRoomId) {
            $ok = TeachingAssignment::where('teacher_id', $teacherId)
                ->where('subject_id', $subjectId)
                ->where('class_room_id', (int) $classRoomId)
                ->where('tahun_ajaran_id', TahunAjaran::aktifId())
                ->exists();
            if (!$ok) {
                return false;
            }
        }

        return true;
    }

    private function validateQuestionIdsBelongToTeacher(array $questionIds, int $teacherId, int $subjectId): bool
    {
        $validCount = CbtQuestion::whereIn('id', $questionIds)
            ->where('teacher_id', $teacherId)
            ->where('subject_id', $subjectId)
            ->count();

        return $validCount === count($questionIds);
    }

    private function resolveMateriId(string $tipe, ?int $materiId, int $teacherId, int $subjectId): int|null
    {
        if ($tipe !== 'latihan' || !$materiId) {
            return null;
        }

        $valid = CbtMateri::where('id', $materiId)
            ->where('teacher_id', $teacherId)
            ->where('subject_id', $subjectId)
            ->exists();

        return $valid ? $materiId : null;
    }

    /**
     * Semua ujian/latihan milik 1 guru (teacher_id eksplisit dari query) —
     * dipakai menu Buat Ujian & Jadwal di sisi admin.
     */
    public function myExams(Request $request)
    {
        $data = $request->validate(['teacher_id' => 'required|exists:teachers,id']);

        return CbtExam::where('teacher_id', $data['teacher_id'])
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with(['subject', 'classRooms', 'materi:id,judul'])
            ->withCount(['examQuestions', 'attempts'])
            ->withExists(['examQuestions as has_essay' => fn ($q) => $q->whereHas('question', fn ($q2) => $q2->where('tipe', 'essay'))])
            ->orderBy('jadwal_mulai')
            ->get();
    }

    public function show(CbtExam $cbtExam)
    {
        return $cbtExam->load('examQuestions', 'classRooms', 'materi:id,judul');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'nama' => 'required|string|max:150',
            'subject_id' => 'required|exists:subjects,id',
            'class_room_ids' => 'required|array|min:1',
            'class_room_ids.*' => 'required|exists:class_rooms,id',
            'durasi_menit' => 'required|integer|min:5|max:300',
            'kkm' => 'nullable|integer|min:0|max:100',
            'jadwal_mulai' => 'required|date',
            'jadwal_selesai' => 'required|date|after:jadwal_mulai',
            'question_ids' => 'required|array|min:1',
            'question_ids.*' => 'required|exists:cbt_questions,id',
            'tipe' => 'nullable|in:ujian,latihan',
            'materi_id' => 'nullable|exists:cbt_materi,id',
        ]);

        $teacherId = (int) $data['teacher_id'];

        if (!$this->teacherMengajarSemuaKelas($teacherId, $data['subject_id'], $data['class_room_ids'])) {
            return response()->json(['message' => 'Guru ini tidak punya Tugas Mengajar untuk mata pelajaran & salah satu kelas yang dipilih.'], 422);
        }

        if (!$this->validateQuestionIdsBelongToTeacher($data['question_ids'], $teacherId, $data['subject_id'])) {
            return response()->json(['message' => 'Ada soal yang dipilih bukan milik guru ini atau bukan untuk mata pelajaran ini.'], 422);
        }

        $tipe = $data['tipe'] ?? 'ujian';
        $materiId = $this->resolveMateriId($tipe, $data['materi_id'] ?? null, $teacherId, $data['subject_id']);

        $exam = DB::transaction(function () use ($data, $teacherId, $tipe, $materiId) {
            $exam = CbtExam::create([
                'nama' => $data['nama'],
                'subject_id' => $data['subject_id'],
                'teacher_id' => $teacherId,
                'durasi_menit' => $data['durasi_menit'],
                'kkm' => $data['kkm'] ?? null,
                'jadwal_mulai' => $data['jadwal_mulai'],
                'jadwal_selesai' => $data['jadwal_selesai'],
                'status' => $tipe === 'ujian' ? 'terbuka' : 'draft',
                'tipe' => $tipe,
                'materi_id' => $materiId,
            ]);

            $exam->classRooms()->sync($data['class_room_ids']);

            foreach ($data['question_ids'] as $index => $questionId) {
                CbtExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_id' => $questionId,
                    'urutan' => $index + 1,
                ]);
            }

            return $exam;
        });

        return response()->json($exam->fresh(['examQuestions', 'classRooms']), 201);
    }

    public function update(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'class_room_ids' => 'required|array|min:1',
            'class_room_ids.*' => 'required|exists:class_rooms,id',
            'durasi_menit' => 'required|integer|min:5|max:300',
            'kkm' => 'nullable|integer|min:0|max:100',
            'jadwal_mulai' => 'required|date',
            'jadwal_selesai' => 'required|date|after:jadwal_mulai',
            'question_ids' => 'required|array|min:1',
            'question_ids.*' => 'required|exists:cbt_questions,id',
            'materi_id' => 'nullable|exists:cbt_materi,id',
        ]);

        if (!$this->teacherMengajarSemuaKelas($cbtExam->teacher_id, $cbtExam->subject_id, $data['class_room_ids'])) {
            return response()->json(['message' => 'Guru ini tidak punya Tugas Mengajar untuk salah satu kelas yang dipilih.'], 422);
        }

        if (!$this->validateQuestionIdsBelongToTeacher($data['question_ids'], $cbtExam->teacher_id, $cbtExam->subject_id)) {
            return response()->json(['message' => 'Ada soal yang dipilih bukan milik guru ini atau bukan untuk mata pelajaran ini.'], 422);
        }

        $this->catatAuditUjian($request, $cbtExam, 'diubah');

        $materiId = $this->resolveMateriId($cbtExam->tipe, $data['materi_id'] ?? null, $cbtExam->teacher_id, $cbtExam->subject_id);

        DB::transaction(function () use ($cbtExam, $data, $materiId) {
            $cbtExam->update([
                'nama' => $data['nama'],
                'durasi_menit' => $data['durasi_menit'],
                'kkm' => $data['kkm'] ?? null,
                'jadwal_mulai' => $data['jadwal_mulai'],
                'jadwal_selesai' => $data['jadwal_selesai'],
                'materi_id' => $materiId,
            ]);

            $cbtExam->classRooms()->sync($data['class_room_ids']);

            $cbtExam->examQuestions()->delete();
            foreach ($data['question_ids'] as $index => $questionId) {
                CbtExamQuestion::create([
                    'exam_id' => $cbtExam->id,
                    'question_id' => $questionId,
                    'urutan' => $index + 1,
                ]);
            }
        });

        return $cbtExam->fresh(['examQuestions', 'classRooms']);
    }

    public function publish(CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->tipe === 'ujian') {
            return response()->json(['message' => 'Ujian berjadwal langsung terbuka otomatis, tidak perlu diterbitkan manual.'], 422);
        }
        if ($cbtExam->status !== 'draft') {
            return response()->json(['message' => 'Hanya ujian berstatus draf yang bisa diterbitkan.'], 422);
        }

        $cbtExam->update(['status' => 'terbuka']);

        return $cbtExam->fresh();
    }

    public function close(CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->tipe === 'ujian') {
            return response()->json(['message' => 'Ujian berjadwal otomatis ditutup begitu jadwal_selesai lewat, tidak perlu ditutup manual.'], 422);
        }
        if ($cbtExam->status !== 'terbuka') {
            return response()->json(['message' => 'Hanya ujian yang sedang terbuka yang bisa ditutup.'], 422);
        }

        $cbtExam->update(['status' => 'selesai']);

        return $cbtExam->fresh();
    }

    public function reopen(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->status !== 'selesai') {
            return response()->json(['message' => 'Hanya ujian yang sudah selesai yang bisa dibuka kembali.'], 422);
        }

        $this->catatAuditUjian($request, $cbtExam, 'dibuka_kembali');

        $cbtExam->update(['status' => 'terbuka', 'status_publikasi' => false]);

        return $cbtExam->fresh();
    }

    public function duplicate(CbtExam $cbtExam)
    {
        $baru = DB::transaction(function () use ($cbtExam) {
            $baru = CbtExam::create([
                'nama' => $cbtExam->nama.' (Salinan)',
                'subject_id' => $cbtExam->subject_id,
                'teacher_id' => $cbtExam->teacher_id,
                'durasi_menit' => $cbtExam->durasi_menit,
                'kkm' => $cbtExam->kkm,
                'jadwal_mulai' => $cbtExam->jadwal_mulai,
                'jadwal_selesai' => $cbtExam->jadwal_selesai,
                'status' => $cbtExam->tipe === 'ujian' ? 'terbuka' : 'draft',
                'tipe' => $cbtExam->tipe,
                'materi_id' => $cbtExam->materi_id,
            ]);

            $baru->classRooms()->sync($cbtExam->classRooms()->pluck('class_rooms.id'));

            foreach ($cbtExam->examQuestions()->orderBy('urutan')->get() as $eq) {
                CbtExamQuestion::create([
                    'exam_id' => $baru->id,
                    'question_id' => $eq->question_id,
                    'urutan' => $eq->urutan,
                ]);
            }

            return $baru;
        });

        return response()->json($baru->fresh(['examQuestions', 'classRooms']), 201);
    }

    public function regenerateToken(CbtExam $cbtExam)
    {
        $cbtExam->update(['token' => CbtExam::generateToken()]);

        return $cbtExam->fresh();
    }

    public function publikasiNilai(CbtExam $cbtExam)
    {
        if ($cbtExam->tipe !== 'ujian') {
            return response()->json(['message' => 'Latihan tidak perlu dipublikasikan, nilai sudah langsung kelihatan siswa.'], 422);
        }
        if ($cbtExam->status !== 'selesai') {
            return response()->json(['message' => 'Tutup ujian ini dulu sebelum mempublikasikan nilainya.'], 422);
        }

        $cbtExam->update(['status_publikasi' => true]);

        return $cbtExam->fresh();
    }

    public function hentikanSemua(CbtExam $cbtExam)
    {
        $berjalan = $cbtExam->attempts()->where('status', 'in_progress')->get();
        foreach ($berjalan as $attempt) {
            $this->finalisasiAttempt($attempt);
        }

        return response()->json(['message' => 'Berhasil menghentikan '.$berjalan->count().' sesi yang sedang berjalan.', 'jumlah' => $berjalan->count()]);
    }

    public function destroy(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }

        // Sengaja tetap boleh walau sudah ada siswa yang mengerjakan — FK
        // cascade ke cbt_exam_attempts & cbt_exam_answers. Jejak audit
        // HARUS dicatat SEBELUM delete() — attempts-nya ikut lenyap begitu
        // cascade jalan.
        $this->catatAuditUjian($request, $cbtExam, 'dihapus');

        $cbtExam->delete();

        return response()->json(['message' => 'Ujian dihapus.']);
    }

    public function attempts(CbtExam $cbtExam)
    {
        $attempts = $cbtExam->attempts()->with('student.user')->withCount('answers')->orderByDesc('skor')->get();

        return response()->json([
            'total_soal' => $cbtExam->examQuestions()->count(),
            'attempts' => $attempts,
        ]);
    }

    public function exportNilai(CbtExam $cbtExam)
    {
        $attempts = $cbtExam->attempts()->with('student.user', 'student.classRoom')->orderByDesc('skor')->get();
        $namaFile = 'nilai_'.Str::slug($cbtExam->nama).'.xlsx';

        return Excel::download(new CbtLaporanNilaiExport($cbtExam, $attempts), $namaFile);
    }

    public function itemAnalysis(CbtExam $cbtExam)
    {
        $submitted = $cbtExam->attempts()->where('status', 'submitted')->orderByDesc('skor')->get(['id', 'skor']);
        $n = $submitted->count();

        if ($n === 0) {
            return response()->json(['n' => 0, 'group_size' => 0, 'questions' => []]);
        }

        $groupSize = max(1, (int) floor($n * 0.27));
        $topIds = $submitted->take($groupSize)->pluck('id');
        $bottomIds = $submitted->slice(-$groupSize)->pluck('id');

        $answers = \App\Models\CbtExamAnswer::whereIn('attempt_id', $submitted->pluck('id'))->get(['question_id', 'attempt_id', 'is_correct']);

        $questions = $cbtExam->examQuestions()->whereHas('question', fn ($q) => $q->where('tipe', 'pg'))->with('question')->get()->map(function ($eq) use ($answers, $n, $groupSize, $topIds, $bottomIds) {
            $qAnswers = $answers->where('question_id', $eq->question_id);
            $correctCount = $qAnswers->where('is_correct', true)->count();
            $difficulty = round($correctCount / $n, 2);

            $correctInTop = $qAnswers->whereIn('attempt_id', $topIds)->where('is_correct', true)->count();
            $correctInBottom = $qAnswers->whereIn('attempt_id', $bottomIds)->where('is_correct', true)->count();
            $discrimination = round(($correctInTop - $correctInBottom) / $groupSize, 2);

            return [
                'id' => $eq->question_id,
                'urutan' => $eq->urutan,
                'pertanyaan' => $eq->question->pertanyaan,
                'difficulty' => $difficulty,
                'discrimination' => $discrimination,
            ];
        })->values();

        return response()->json(['n' => $n, 'group_size' => $groupSize, 'questions' => $questions]);
    }

    public function resetAttempt(CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Cuma sesi yang sedang berjalan yang bisa direset.'], 422);
        }

        DB::transaction(function () use ($cbtExamAttempt) {
            $cbtExamAttempt->answers()->delete();
            $cbtExamAttempt->update([
                'started_at' => now(),
                'tab_switch_count' => 0,
                'device_token' => null,
            ]);
        });

        return response()->json(['message' => 'Sesi direset.']);
    }

    public function hentikanAttempt(CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Sesi ini sudah selesai.'], 422);
        }

        $this->finalisasiAttempt($cbtExamAttempt);

        return $cbtExamAttempt->fresh();
    }

    public function tambahWaktu(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Cuma sesi yang sedang berjalan yang bisa ditambah waktunya.'], 422);
        }

        $data = $request->validate([
            'menit' => 'required|integer|min:1|max:180',
        ]);

        $cbtExamAttempt->increment('extra_minutes', $data['menit']);

        return response()->json(['message' => 'Waktu ditambah.', 'extra_minutes' => $cbtExamAttempt->fresh()->extra_minutes]);
    }

    public function kirimKeNilaiAkademik(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tipe === 'ujian' && !$cbtExam->status_publikasi) {
            return response()->json(['message' => 'Publikasikan nilai ujian ini dulu sebelum dikirim ke Nilai Akademik.'], 422);
        }

        $classRoomIds = $cbtExam->classRooms()->pluck('class_rooms.id')->all();
        if (!$this->teacherMengajarSemuaKelas($cbtExam->teacher_id, $cbtExam->subject_id, $classRoomIds)) {
            return response()->json(['message' => 'Guru ini tidak lagi punya Tugas Mengajar untuk kelas ujian ini.'], 422);
        }

        $data = $request->validate([
            'nama_kegiatan' => 'nullable|string|max:100',
            'tanggal' => 'nullable|date',
        ]);
        $namaKegiatan = $data['nama_kegiatan'] ?? $cbtExam->nama;
        $tanggal = $data['tanggal'] ?? now()->toDateString();

        $studentIds = Student::whereIn('class_room_id', $classRoomIds)->where('status', 'aktif')->pluck('id');

        $skorTerbaikPerSiswa = $cbtExam->attempts()
            ->where('status', 'submitted')
            ->selectRaw('student_id, MAX(skor) as skor_terbaik')
            ->groupBy('student_id')
            ->pluck('skor_terbaik', 'student_id');

        DB::transaction(function () use ($studentIds, $skorTerbaikPerSiswa, $cbtExam, $namaKegiatan, $tanggal, $request) {
            foreach ($studentIds as $studentId) {
                AcademicScore::updateOrCreate(
                    [
                        'student_id' => $studentId,
                        'subject_id' => $cbtExam->subject_id,
                        'tahun_ajaran_id' => TahunAjaran::aktifId(),
                        'nama_kegiatan' => $namaKegiatan,
                        'tanggal' => $tanggal,
                    ],
                    [
                        'skor' => (int) round($skorTerbaikPerSiswa[$studentId] ?? 0),
                        'recorded_by' => $request->user()->id,
                    ]
                );
            }
        });

        $jumlahMengerjakan = $skorTerbaikPerSiswa->count();

        return response()->json([
            'message' => $studentIds->count().' siswa tercatat ke Nilai Akademik ("'.$namaKegiatan.'") — '.$jumlahMengerjakan.' mengerjakan, '.($studentIds->count() - $jumlahMengerjakan).' tercatat skor 0 (tidak mengerjakan).',
            'jumlah' => $studentIds->count(),
        ]);
    }
}
