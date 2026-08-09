<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicScore;
use App\Models\Student;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicScoreController extends Controller
{
    /**
     * Pastikan guru yang login memang punya Tugas Mengajar untuk mapel+kelas
     * ini di tahun ajaran aktif — tanpa ini, guru bisa lihat/isi/ubah nilai
     * mapel/kelas siapa saja cuma dengan mengganti subject_id/class_room_id
     * di request (dropdown frontend cuma penyaring tampilan, bukan pengaman).
     */
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
     * Riwayat nilai 1 mapel + 1 kelas, tahun ajaran aktif — dipakai tab
     * Nilai di dashboard Guru. Terbaru dulu.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'class_room_id' => 'required|exists:class_rooms,id',
        ]);

        if (!$this->isOwnAssignment($request, $data['subject_id'], $data['class_room_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & kelas ini.'], 403);
        }

        return AcademicScore::with('student.user')
            ->where('subject_id', $data['subject_id'])
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->whereHas('student', fn ($q) => $q->where('class_room_id', $data['class_room_id']))
            ->orderByDesc('tanggal')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Simpan nilai 1 kegiatan (mis. "PR Bab 3") untuk banyak siswa sekaligus
     * — dipakai form utama tab Nilai, supaya guru tidak perlu klik simpan
     * satu-satu per siswa. Semua siswa yang diisi wajib dari kelas yang
     * sama, dan kelas+mapel itu wajib benar Tugas Mengajar guru ini.
     */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'nama_kegiatan' => 'required|string|max:100',
            'tanggal' => 'required|date',
            'skor' => 'required|array|min:1',
            'skor.*.student_id' => 'required|exists:students,id',
            'skor.*.nilai' => 'required|integer|min:0|max:100',
        ]);

        $studentIds = collect($data['skor'])->pluck('student_id')->unique();
        $classRoomIds = Student::whereIn('id', $studentIds)->pluck('class_room_id')->unique();

        if ($classRoomIds->count() !== 1) {
            return response()->json(['message' => 'Semua siswa yang diisi nilainya harus dari kelas yang sama.'], 422);
        }

        if (!$this->isOwnAssignment($request, $data['subject_id'], $classRoomIds->first())) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & kelas ini.'], 403);
        }

        $jumlah = DB::transaction(function () use ($data, $request) {
            foreach ($data['skor'] as $item) {
                AcademicScore::create([
                    'student_id' => $item['student_id'],
                    'subject_id' => $data['subject_id'],
                    'nama_kegiatan' => $data['nama_kegiatan'],
                    'skor' => $item['nilai'],
                    'tanggal' => $data['tanggal'],
                    'recorded_by' => $request->user()->id,
                ]);
            }
            return count($data['skor']);
        });

        return response()->json(['message' => "$jumlah nilai berhasil disimpan."], 201);
    }

    /**
     * Koreksi 1 baris nilai yang salah input — dikunci ke tahun ajaran aktif
     * saja (sama seperti Tugas Mengajar/Jadwal), dan cuma guru yang memang
     * punya Tugas Mengajar untuk mapel+kelas nilai ini yang boleh mengubah.
     */
    public function update(Request $request, AcademicScore $academicScore)
    {
        if ($academicScore->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Nilai ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $academicScore->loadMissing('student');
        if (!$this->isOwnAssignment($request, $academicScore->subject_id, $academicScore->student->class_room_id)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah nilai ini.'], 403);
        }

        $data = $request->validate([
            'nama_kegiatan' => 'required|string|max:100',
            'skor' => 'required|integer|min:0|max:100',
            'tanggal' => 'required|date',
        ]);

        $academicScore->update($data);

        return $academicScore->fresh('student.user');
    }

    public function destroy(Request $request, AcademicScore $academicScore)
    {
        if ($academicScore->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Nilai ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus.'], 422);
        }

        $academicScore->loadMissing('student');
        if (!$this->isOwnAssignment($request, $academicScore->subject_id, $academicScore->student->class_room_id)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus nilai ini.'], 403);
        }

        $academicScore->delete();

        return response()->json(['message' => 'Nilai dihapus.']);
    }

    /**
     * Riwayat nilai siswa yang sedang login sendiri — dibatasi tahun ajaran
     * aktif, supaya nama kegiatan yang sama (mis. "PR Bab 3") dari tahun
     * ajaran berbeda tidak tercampur jadi 1 daftar tanpa keterangan tahun.
     */
    public function myScores(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json([]);
        }

        return AcademicScore::with('subject')
            ->where('student_id', $student->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('tanggal')
            ->get();
    }
}
