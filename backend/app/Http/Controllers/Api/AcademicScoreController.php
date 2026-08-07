<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicScore;
use App\Models\Student;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicScoreController extends Controller
{
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
     * satu-satu per siswa.
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
     * saja, sama seperti Tugas Mengajar/Jadwal, supaya nilai tahun ajaran
     * lama tidak bisa tidak sengaja berubah begitu tahun ajaran sudah ganti.
     */
    public function update(Request $request, AcademicScore $academicScore)
    {
        if ($academicScore->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Nilai ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'nama_kegiatan' => 'required|string|max:100',
            'skor' => 'required|integer|min:0|max:100',
            'tanggal' => 'required|date',
        ]);

        $academicScore->update($data);

        return $academicScore->fresh('student.user');
    }

    public function destroy(AcademicScore $academicScore)
    {
        if ($academicScore->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Nilai ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus.'], 422);
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
