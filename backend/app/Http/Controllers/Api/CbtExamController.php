<?php

namespace App\Http\Controllers\Api;

use App\Exports\CbtLaporanNilaiExport;
use App\Http\Controllers\Api\Concerns\HitungSkorCbt;
use App\Http\Controllers\Api\Concerns\LogsCbtExamAudit;
use App\Http\Controllers\Controller;
use App\Models\AcademicScore;
use App\Models\CbtExam;
use App\Models\CbtExamAnswer;
use App\Models\CbtExamAttempt;
use App\Models\CbtExamQuestion;
use App\Models\CbtMateri;
use App\Models\CbtQuestion;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class CbtExamController extends Controller
{
    use HitungSkorCbt;
    use LogsCbtExamAudit;

    /**
     * Notif "ujian baru dijadwalkan" ke semua siswa aktif di kelas yang
     * dituju — dipanggil begitu ujian (tipe "ujian", bukan latihan)
     * langsung terbuka saat dibuat (lihat komentar status di store()).
     */
    private function notifyUjianDijadwalkan(CbtExam $exam, array $classRoomIds): void
    {
        $subject = Subject::find($exam->subject_id);
        $students = Student::with('user')->whereIn('class_room_id', $classRoomIds)->where('status', 'aktif')->get();
        NotificationDispatcher::sendMany($students->pluck('user')->filter(), 'ujian', 'Ujian baru dijadwalkan', "Ujian \"{$exam->nama}\" ({$subject?->nama}) dijadwalkan {$exam->jadwal_mulai} s.d. {$exam->jadwal_selesai}.", '/siswa');
    }

    /**
     * Notif "latihan baru dibuka" ke semua siswa aktif di kelas yang
     * dituju — dipanggil begitu latihan (tipe "latihan") diterbitkan
     * manual lewat publish().
     */
    private function notifyLatihanDibuka(CbtExam $exam): void
    {
        $exam->loadMissing('classRooms', 'subject');
        $classRoomIds = $exam->classRooms->pluck('id');
        $students = Student::with('user')->whereIn('class_room_id', $classRoomIds)->where('status', 'aktif')->get();
        NotificationDispatcher::sendMany($students->pluck('user')->filter(), 'ujian', 'Latihan baru dibuka', "Latihan \"{$exam->nama}\" ({$exam->subject?->nama}) sudah bisa dikerjakan.", '/siswa');
    }

    /**
     * Notif "hasil ujian keluar" ke siswa yang sudah mengerjakan (attempt)
     * ujian ini — dipanggil begitu nilai dipublikasikan.
     */
    private function notifyHasilUjianKeluar(CbtExam $exam): void
    {
        $userIds = $exam->attempts()->with('student.user')->get()
            ->pluck('student.user')->filter()->unique('id');
        NotificationDispatcher::sendMany($userIds, 'ujian', 'Hasil ujian keluar', "Hasil ujian \"{$exam->nama}\" sudah bisa dilihat.", '/siswa');
    }

    private function isOwnAssignment(Request $request, int $subjectId, int $classRoomId): bool
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return false;
        }

        return TeachingAssignment::where('teacher_id', $teacher->id)
            ->where('subject_id', $subjectId)
            ->where('class_room_id', $classRoomId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->exists();
    }

    /**
     * Guru cuma boleh pakai kelas yang benar-benar diampunya untuk mapel
     * ini — dicek SATU-SATU per kelas yang dipilih (bukan cuma kelas
     * pertama), supaya tidak bisa menyelundupkan kelas yang bukan
     * miliknya lewat request langsung ke API.
     */
    private function semuaKelasDiampu(Request $request, int $subjectId, array $classRoomIds): bool
    {
        foreach ($classRoomIds as $classRoomId) {
            if (!$this->isOwnAssignment($request, $subjectId, (int) $classRoomId)) {
                return false;
            }
        }

        return true;
    }

    private function ownTeacherId(Request $request): ?int
    {
        return Teacher::where('user_id', $request->user()->id)->value('id');
    }

    /**
     * materi_id cuma relevan untuk latihan (dipakai menampilkan latihan
     * terkait di halaman Materi siswa) — null-kan diam-diam kalau
     * tipe-nya ujian, dan pastikan materi yang dipilih memang milik guru
     * ini & mapel yang sama supaya tidak bisa menyambung ke materi orang
     * lain lewat request langsung ke API.
     */
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

    public function index(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'class_room_id' => 'required|exists:class_rooms,id',
        ]);

        if (!$this->isOwnAssignment($request, $data['subject_id'], $data['class_room_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & kelas ini.'], 403);
        }

        return CbtExam::where('teacher_id', $this->ownTeacherId($request))
            ->where('subject_id', $data['subject_id'])
            ->whereHas('classRooms', fn ($q) => $q->where('class_rooms.id', $data['class_room_id']))
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with('classRooms')
            ->withCount(['examQuestions', 'attempts'])
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Daftar semua ujian/latihan milik guru ini lintas mapel & kelas —
     * dipakai menu Jadwal, supaya guru tidak perlu pilih mapel+kelas dulu
     * cuma untuk lihat jadwal keseluruhan.
     */
    public function myExams(Request $request)
    {
        $teacherId = $this->ownTeacherId($request);
        if (!$teacherId) {
            return response()->json([]);
        }

        return CbtExam::where('teacher_id', $teacherId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with(['subject', 'classRooms', 'materi:id,judul'])
            ->withCount(['examQuestions', 'attempts'])
            ->withExists(['examQuestions as has_essay' => fn ($q) => $q->whereHas('question', fn ($q2) => $q2->where('tipe', 'essay'))])
            ->orderBy('jadwal_mulai')
            ->get();
    }

    private function validateQuestionIdsBelongToTeacher(array $questionIds, int $teacherId, int $subjectId): bool
    {
        $validCount = CbtQuestion::whereIn('id', $questionIds)
            ->where('teacher_id', $teacherId)
            ->where('subject_id', $subjectId)
            ->count();

        return $validCount === count($questionIds);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
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

        if (!$this->semuaKelasDiampu($request, $data['subject_id'], $data['class_room_ids'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & salah satu kelas yang dipilih.'], 403);
        }

        $teacherId = $this->ownTeacherId($request);

        if (!$this->validateQuestionIdsBelongToTeacher($data['question_ids'], $teacherId, $data['subject_id'])) {
            return response()->json(['message' => 'Ada soal yang dipilih bukan milik Anda atau bukan untuk mata pelajaran ini.'], 422);
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
                // Ujian (tipe "ujian") sudah punya jadwal_mulai/jadwal_selesai
                // sendiri, jadi langsung "terbuka" tanpa perlu tombol Terbitkan
                // manual — akses siswa tetap dijaga jadwalnya lewat
                // isOpenForAttempt(), dan penutupannya otomatis lewat command
                // cbt:tutup-ujian-terjadwal begitu jadwal_selesai lewat. Latihan
                // tidak punya jadwal jadi tetap "draft" (Terbitkan/Tutup manual).
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

        if ($tipe === 'ujian') {
            $this->notifyUjianDijadwalkan($exam, $data['class_room_ids']);
        }

        return response()->json($exam->fresh(['examQuestions', 'classRooms']), 201);
    }

    /**
     * Detail 1 ujian termasuk soal & kelasnya — dipakai form Edit Ujian di
     * frontend supaya bisa prefill soal yang sudah dipilih sebelumnya
     * (myExams()/index() cuma kirim hitungannya, bukan daftar question_id).
     */
    public function show(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang melihat ujian ini.'], 403);
        }

        return $cbtExam->load('examQuestions', 'classRooms', 'materi:id,judul');
    }

    /**
     * Edit & Hapus SENGAJA tetap boleh walau sudah ada siswa yang
     * mengerjakan — dipakai kalau ada kesalahan (soal keliru, jadwal
     * salah) yang perlu diperbaiki setelah ujian berjalan. Guru yang
     * memilih melakukan ini menanggung risikonya sendiri: mengubah soal
     * di tengah jalan bisa membuat jawaban siswa yang sudah tersimpan
     * "tertinggal" (tidak dihapus, cuma tidak lagi dihitung di skor karena
     * tidak lagi ada di examQuestions), dan menghapus ujian yang sudah
     * dikerjakan akan MENGHAPUS PERMANEN semua attempt & jawaban siswa
     * (FK cascade) — makanya konfirmasi di frontend dibuat tegas soal ini.
     */
    public function update(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah ujian ini.'], 403);
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

        if (!$this->semuaKelasDiampu($request, $cbtExam->subject_id, $data['class_room_ids'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk salah satu kelas yang dipilih.'], 403);
        }

        if (!$this->validateQuestionIdsBelongToTeacher($data['question_ids'], $cbtExam->teacher_id, $cbtExam->subject_id)) {
            return response()->json(['message' => 'Ada soal yang dipilih bukan milik Anda atau bukan untuk mata pelajaran ini.'], 422);
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

    public function publish(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
        }
        if ($cbtExam->tipe === 'ujian') {
            return response()->json(['message' => 'Ujian berjadwal langsung terbuka otomatis, tidak perlu diterbitkan manual.'], 422);
        }
        if ($cbtExam->status !== 'draft') {
            return response()->json(['message' => 'Hanya ujian berstatus draf yang bisa diterbitkan.'], 422);
        }

        $cbtExam->update(['status' => 'terbuka']);

        $this->notifyLatihanDibuka($cbtExam);

        return $cbtExam->fresh();
    }

    public function close(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
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

    /**
     * Buka kembali ujian yang sudah ditutup (status "selesai" -> "terbuka")
     * — dipakai kalau ternyata masih ada siswa yang perlu mengerjakan lagi
     * setelah ujian keburu ditutup. status_publikasi SENGAJA ikut direset
     * ke false — kalau tidak, nilai yang sudah terlanjur dipublikasikan
     * akan tetap kelihatan siswa lain padahal ujian sedang dibuka lagi
     * (celah lihat skor duluan sebelum ujian benar-benar selesai untuk
     * semua orang); guru wajib publikasikan ulang manual setelah ujian
     * ditutup lagi.
     *
     * Khusus tipe "ujian": satu-satunya cara sampai berstatus "selesai"
     * sekarang adalah jadwal_selesai-nya sudah lewat (lihat
     * cbt:tutup-ujian-terjadwal) — reopen tanpa memperpanjang jadwal itu
     * PERCUMA: isOpenForAttempt() tetap menolak siswa (masih di luar
     * jadwal_mulai..jadwal_selesai) DAN command penutup otomatis bakal
     * langsung menutupnya lagi begitu jalan berikutnya. Makanya
     * jadwal_selesai baru (wajib di masa depan) diwajibkan di sini.
     */
    public function reopen(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
        }
        if ($cbtExam->status !== 'selesai') {
            return response()->json(['message' => 'Hanya ujian yang sudah selesai yang bisa dibuka kembali.'], 422);
        }

        $update = ['status' => 'terbuka', 'status_publikasi' => false];

        if ($cbtExam->tipe === 'ujian') {
            $data = $request->validate([
                'jadwal_selesai' => 'required|date|after:now',
            ]);
            $update['jadwal_selesai'] = $data['jadwal_selesai'];
        }

        $this->catatAuditUjian($request, $cbtExam, 'dibuka_kembali');

        $cbtExam->update($update);

        return $cbtExam->fresh();
    }

    /**
     * Duplikat ujian/latihan — bikin salinan baru (nama, mapel, kelas,
     * durasi, KKM, materi, & semua soal terpasang) tanpa perlu susun ulang
     * dari nol. Jadwal ikut disalin apa adanya (guru tinggal edit lewat
     * tombol Edit kalau perlu jadwal baru); token & tahun_ajaran_id
     * SENGAJA tidak ikut disalin (auto-generate lewat CbtExam::booted())
     * supaya salinannya tidak berbagi token dengan aslinya. Attempt/nilai
     * TIDAK ikut disalin — salinan selalu mulai bersih tanpa peserta.
     */
    public function duplicate(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menduplikat ujian ini.'], 403);
        }

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

    /**
     * Ganti token ujian — dipakai kalau token bocor/salah bagi, atau
     * cuma mau bikin baru. Boleh kapan saja (bukan cuma saat draf) karena
     * siswa yang sudah join tidak butuh token lagi setelah attempt-nya
     * terbuat, jadi tidak mengganggu sesi yang sedang berjalan.
     */
    public function regenerateToken(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
        }

        $cbtExam->update(['token' => CbtExam::generateToken()]);

        return $cbtExam->fresh();
    }

    /**
     * Publikasikan nilai — gerbang terpisah dari "Tutup Ujian" (status
     * selesai), supaya guru punya jeda buat koreksi essay dulu sebelum
     * siswa lihat skor akhirnya. Cuma berlaku untuk tipe "ujian" — latihan
     * selalu langsung kelihatan begitu attempt submitted.
     */
    public function publikasiNilai(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
        }
        if ($cbtExam->tipe !== 'ujian') {
            return response()->json(['message' => 'Latihan tidak perlu dipublikasikan, nilai sudah langsung kelihatan siswa.'], 422);
        }
        if ($cbtExam->status !== 'selesai') {
            return response()->json(['message' => 'Tutup ujian ini dulu sebelum mempublikasikan nilainya.'], 422);
        }

        $cbtExam->update(['status_publikasi' => true]);

        $this->notifyHasilUjianKeluar($cbtExam);

        return $cbtExam->fresh();
    }

    /**
     * Paksa-hentikan (force-submit) 1 sesi siswa yang macet/dicurigai
     * curang — jawaban yang sudah tersimpan difinalisasi apa adanya,
     * sama seperti kalau waktu habis sendiri.
     */
    public function hentikanAttempt(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->exam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola sesi ini.'], 403);
        }
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Sesi ini sudah selesai.'], 422);
        }

        $this->finalisasiAttempt($cbtExamAttempt);

        $cbtExamAttempt->loadMissing('student.user', 'exam');
        if ($cbtExamAttempt->student?->user) {
            NotificationDispatcher::send($cbtExamAttempt->student->user, 'ujian', 'Sesi ujian dihentikan', "Sesi ujian \"{$cbtExamAttempt->exam->nama}\" kamu dihentikan paksa oleh guru, jawaban yang tersimpan sudah difinalisasi.", '/siswa');
        }

        return $cbtExamAttempt->fresh();
    }

    /**
     * Paksa-hentikan SEMUA sesi siswa yang masih berjalan untuk 1 ujian
     * sekaligus — dipakai kalau ada gangguan massal (listrik padam, lab
     * bermasalah, dst), bukan buat 1-2 siswa saja (pakai hentikanAttempt).
     */
    public function hentikanSemua(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
        }

        // Semua attempt di sini berbagi 1 exam yang sama — muat soal exam-nya
        // SEKALI di sini dan teruskan ke tiap finalisasi, bukan biarkan
        // hitungSkorAttempt() query ulang exam+examQuestions+question untuk
        // tiap attempt (mis. 40 siswa = 40x query identik sebelumnya).
        $examQuestions = $cbtExam->examQuestions()->with('question')->get();
        $berjalan = $cbtExam->attempts()->where('status', 'in_progress')->with(['answers', 'student.user'])->get();
        foreach ($berjalan as $attempt) {
            $this->finalisasiAttempt($attempt, $examQuestions);
        }

        NotificationDispatcher::sendMany($berjalan->pluck('student.user')->filter(), 'ujian', 'Sesi ujian dihentikan', "Sesi ujian \"{$cbtExam->nama}\" dihentikan paksa oleh guru, jawaban yang tersimpan sudah difinalisasi.", '/siswa');

        return response()->json(['message' => 'Berhasil menghentikan '.$berjalan->count().' sesi yang sedang berjalan.', 'jumlah' => $berjalan->count()]);
    }

    public function destroy(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Ujian ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus ujian ini.'], 403);
        }

        // Sengaja tetap boleh walau sudah ada siswa yang mengerjakan — FK
        // cascade ke cbt_exam_attempts & cbt_exam_answers, jadi semua
        // jawaban/skor siswa untuk ujian ini ikut terhapus PERMANEN. Jejak
        // audit HARUS dicatat SEBELUM delete() — attempts-nya ikut lenyap
        // begitu cascade jalan.
        $this->catatAuditUjian($request, $cbtExam, 'dihapus');

        $cbtExam->delete();

        return response()->json(['message' => 'Ujian dihapus.']);
    }

    /**
     * Reset sesi siswa yang macet (device rusak, salah pencet, dsb) —
     * hapus jawaban yang sudah tersimpan, timer mulai ulang dari 0, dan
     * lepas kunci perangkat (device_token) supaya bisa dilanjutkan dari
     * perangkat manapun setelah ini.
     */
    public function resetAttempt(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->exam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola sesi ini.'], 403);
        }
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

        $cbtExamAttempt->loadMissing('student.user', 'exam');
        if ($cbtExamAttempt->student?->user) {
            NotificationDispatcher::send($cbtExamAttempt->student->user, 'ujian', 'Sesi ujian direset', "Sesi ujian \"{$cbtExamAttempt->exam->nama}\" kamu direset oleh guru, silakan kerjakan ulang dari awal.", '/siswa');
        }

        return response()->json(['message' => 'Sesi direset.']);
    }

    /**
     * Tambah waktu 1 siswa yang sedang mengerjakan — dipakai kalau ada
     * gangguan (mati lampu, laptop restart, koneksi putus) supaya siswa
     * dapat kompensasi waktu TANPA kehilangan jawaban yang sudah tersimpan
     * (beda dari resetAttempt() yang sengaja menghapus semua jawaban).
     * Kumulatif — dipanggil berkali-kali akan terus menambah, bukan
     * menimpa.
     */
    public function tambahWaktu(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->exam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola sesi ini.'], 403);
        }
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Cuma sesi yang sedang berjalan yang bisa ditambah waktunya.'], 422);
        }

        $data = $request->validate([
            'menit' => 'required|integer|min:1|max:180',
        ]);

        $cbtExamAttempt->increment('extra_minutes', $data['menit']);

        return response()->json(['message' => 'Waktu ditambah.', 'extra_minutes' => $cbtExamAttempt->fresh()->extra_minutes]);
    }

    public function attempts(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data ujian ini.'], 403);
        }

        $attempts = $cbtExam->attempts()->with('student.user')->withCount('answers')->orderByDesc('skor')->get();

        return response()->json([
            'total_soal' => $cbtExam->examQuestions()->count(),
            'attempts' => $attempts,
        ]);
    }

    public function exportNilai(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data ujian ini.'], 403);
        }

        $attempts = $cbtExam->attempts()->with('student.user', 'student.classRoom')->orderByDesc('skor')->get();
        $namaFile = 'nilai_'.Str::slug($cbtExam->nama).'.xlsx';

        return Excel::download(new CbtLaporanNilaiExport($cbtExam, $attempts), $namaFile);
    }

    /**
     * Analisis butir soal: tingkat kesukaran (proporsi jawaban benar) dan
     * daya beda (selisih tingkat benar antara kelompok atas & bawah 27%
     * berdasarkan skor total) per soal, dihitung dari attempt yang sudah
     * submitted. Dihitung langsung (bukan job terjadwal) karena skalanya
     * kecil — 1 kelas per ujian.
     */
    public function itemAnalysis(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data ujian ini.'], 403);
        }

        $submitted = $cbtExam->attempts()->where('status', 'submitted')->orderByDesc('skor')->get(['id', 'skor']);
        $n = $submitted->count();

        if ($n === 0) {
            return response()->json(['n' => 0, 'group_size' => 0, 'questions' => []]);
        }

        $groupSize = max(1, (int) floor($n * 0.27));
        $topIds = $submitted->take($groupSize)->pluck('id');
        $bottomIds = $submitted->slice(-$groupSize)->pluck('id');

        $answers = CbtExamAnswer::whereIn('attempt_id', $submitted->pluck('id'))->get(['question_id', 'attempt_id', 'is_correct']);

        // Essay tidak punya jawaban "benar" otomatis (dikoreksi manual) —
        // ikut sertakan dalam kesukaran/daya-beda cuma akan menyesatkan
        // (selalu tampak "Sukar" karena is_correct-nya tidak pernah true).
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

    /**
     * Kirim skor ujian/latihan ini ke Nilai Akademik (rapor) — 1 baris
     * AcademicScore per siswa AKTIF di kelas ujian ini (BUKAN cuma yang
     * sudah mengerjakan — siswa yang tidak mengerjakan tetap tercatat
     * dengan skor 0, konsisten dengan konvensi input manual Nilai
     * Akademik: "yang dikosongkan otomatis tercatat 0, bukan dilewati",
     * lihat NilaiTab.jsx). Di-updateOrCreate keyed persis pola
     * AcademicScoreController::storeBulk() (student_id+subject_id+
     * tahun_ajaran_id+nama_kegiatan+tanggal) supaya aman dipanggil BERKALI-
     * KALI (mis. setelah essay dikoreksi ulang & skor berubah, atau siswa
     * yang tadinya belum mengerjakan baru submit belakangan, kirim lagi
     * cukup menimpa baris yang sama, bukan bikin duplikat).
     *
     * Untuk LATIHAN (boleh dikerjakan berkali-kali) dipakai skor TERBAIK
     * per siswa dari attempt yang submitted — sama seperti skor_terbaik
     * yang ditampilkan ke siswa sendiri di halaman Materi. Untuk latihan
     * juga TIDAK menunggu status_publikasi (latihan memang tidak pernah
     * dipublikasikan, nilainya sudah langsung final begitu submit — lihat
     * CbtExam::nilaiBolehDilihatSiswa()) — cuma UJIAN yang menunggu
     * publikasi supaya skor yang masuk rapor sudah final (essay-nya sudah
     * selesai dikoreksi semua).
     */
    public function kirimKeNilaiAkademik(Request $request, CbtExam $cbtExam)
    {
        if ($cbtExam->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengelola ujian ini.'], 403);
        }
        if ($cbtExam->tipe === 'ujian' && !$cbtExam->status_publikasi) {
            return response()->json(['message' => 'Publikasikan nilai ujian ini dulu sebelum dikirim ke Nilai Akademik.'], 422);
        }

        $classRoomIds = $cbtExam->classRooms()->pluck('class_rooms.id')->all();
        if (!$this->semuaKelasDiampu($request, $cbtExam->subject_id, $classRoomIds)) {
            return response()->json(['message' => 'Anda tidak lagi punya Tugas Mengajar untuk kelas ujian ini.'], 403);
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
