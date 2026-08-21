<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\SaringHtmlCbt;
use App\Http\Controllers\Controller;
use App\Models\CbtExam;
use App\Models\CbtExamAttempt;
use App\Models\CbtMateri;
use App\Models\CbtTujuanPembelajaran;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Materi bacaan sederhana (artikel + gambar sampul) — TERPISAH dari LMS
 * Gamifikasi (XP/level/misi) yang sengaja tidak dipasang lagi. Guru tulis
 * & terbitkan, siswa baca (hits dihitung tiap kali dibuka).
 */
class CbtMateriController extends Controller
{
    use SaringHtmlCbt;

    private function ownTeacherId(Request $request): ?int
    {
        return Teacher::where('user_id', $request->user()->id)->value('id');
    }

    /**
     * TP milik guru ini benar-benar miliknya — dicek tiap kali materi
     * dibuat/diubah supaya tidak bisa "menitipkan" materi ke TP guru lain
     * lewat request langsung ke API.
     */
    private function ownTp(Request $request, int $tpId): ?CbtTujuanPembelajaran
    {
        return CbtTujuanPembelajaran::where('id', $tpId)
            ->where('teacher_id', $this->ownTeacherId($request))
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->first();
    }

    public function index(Request $request)
    {
        return CbtMateri::where('teacher_id', $this->ownTeacherId($request))
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with('subject', 'tp')
            ->withCount('latihan')
            ->orderByDesc('id')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string|max:2000000',
            'tp_id' => 'required|exists:cbt_tujuan_pembelajaran,id',
            'status' => 'nullable|in:draft,terbit',
            'gambar' => 'nullable|image|max:2048',
        ]);

        $tp = $this->ownTp($request, $data['tp_id']);
        if (!$tp) {
            return response()->json(['message' => 'TP tidak ditemukan atau bukan milik Anda.'], 403);
        }

        $data['teacher_id'] = $this->ownTeacherId($request);
        // Subject materi selalu ikut subject TP-nya — bukan dipilih
        // terpisah, supaya tidak mungkin materi "menyeberang" mapel dari
        // TP wadahnya.
        $data['subject_id'] = $tp->subject_id;
        $data['isi'] = $this->saringHtml($data['isi']);
        $data['status'] = $data['status'] ?? 'draft';

        if ($request->hasFile('gambar')) {
            $data['gambar_path'] = $request->file('gambar')->store('cbt-materi-gambar', 'public');
        }
        unset($data['gambar']);

        return response()->json(CbtMateri::create($data), 201);
    }

    public function update(Request $request, CbtMateri $cbtMateri)
    {
        if ($cbtMateri->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah materi ini.'], 403);
        }
        if ($cbtMateri->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Materi ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string|max:2000000',
            'tp_id' => 'required|exists:cbt_tujuan_pembelajaran,id',
            'status' => 'required|in:draft,terbit',
        ]);

        $tp = $this->ownTp($request, $data['tp_id']);
        if (!$tp) {
            return response()->json(['message' => 'TP tidak ditemukan atau bukan milik Anda.'], 403);
        }
        $data['subject_id'] = $tp->subject_id;
        $data['isi'] = $this->saringHtml($data['isi']);

        $cbtMateri->update($data);

        return $cbtMateri->fresh();
    }

    /**
     * Upload/ganti gambar sampul — endpoint terpisah dari update() (PHP
     * tidak mengisi $_FILES untuk request PUT bermedia multipart), sama
     * pola seperti CbtQuestionController::uploadAudio().
     */
    public function uploadGambar(Request $request, CbtMateri $cbtMateri)
    {
        if ($cbtMateri->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah materi ini.'], 403);
        }
        if ($cbtMateri->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Materi ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $request->validate(['gambar' => 'required|image|max:2048']);

        if ($cbtMateri->gambar_path) {
            Storage::disk('public')->delete($cbtMateri->gambar_path);
        }
        $cbtMateri->update(['gambar_path' => $request->file('gambar')->store('cbt-materi-gambar', 'public')]);

        return $cbtMateri->fresh();
    }

    public function destroy(Request $request, CbtMateri $cbtMateri)
    {
        if ($cbtMateri->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Materi ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtMateri->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus materi ini.'], 403);
        }

        if ($cbtMateri->gambar_path) {
            Storage::disk('public')->delete($cbtMateri->gambar_path);
        }
        $cbtMateri->delete();

        return response()->json(['message' => 'Materi dihapus.']);
    }

    /**
     * Daftar materi TERBIT buat siswa — lintas mapel, tidak dibatasi ke
     * kelas siswa (materi bacaan umum, beda dari ujian/latihan yang
     * memang harus per-kelas).
     */
    public function myMateri(Request $request)
    {
        return CbtMateri::where('status', 'terbit')
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with('subject', 'tp')
            ->orderByDesc('id')
            ->get(['id', 'judul', 'gambar_path', 'subject_id', 'tp_id', 'hits', 'created_at']);
    }

    public function show(Request $request, CbtMateri $cbtMateri)
    {
        if ($cbtMateri->status !== 'terbit') {
            abort(404);
        }

        $cbtMateri->increment('hits');

        $student = \App\Models\Student::where('user_id', $request->user()->id)->first();

        // Latihan yang dilampirkan ke materi ini — cuma yang memang boleh
        // dilihat siswa (terbuka & kelasnya diikutkan), persis aturan
        // StudentExamController::myLatihan(). Dilewati kalau yang buka
        // bukan siswa (mis. guru ikut mengintip materi terbit).
        $latihan = [];
        if ($student) {
            $exams = $cbtMateri->latihan()
                ->whereHas('classRooms', fn ($q) => $q->where('class_rooms.id', $student->class_room_id))
                ->where('status', 'terbuka')
                ->withCount('examQuestions')
                ->orderBy('nama')
                ->get();

            $terbaik = CbtExamAttempt::where('student_id', $student->id)
                ->where('status', 'submitted')
                ->whereIn('exam_id', $exams->pluck('id'))
                ->selectRaw('exam_id, MAX(skor) as skor_terbaik')
                ->groupBy('exam_id')
                ->pluck('skor_terbaik', 'exam_id');

            $latihan = $exams->map(fn (CbtExam $exam) => [
                'id' => $exam->id,
                'nama' => $exam->nama,
                'jumlah_soal' => $exam->exam_questions_count,
                'skor_terbaik' => $terbaik[$exam->id] ?? null,
            ])->values();
        }

        $materi = $cbtMateri->fresh(['subject', 'tp', 'teacher.user'])->toArray();
        $materi['latihan'] = $latihan;

        return response()->json($materi);
    }
}
