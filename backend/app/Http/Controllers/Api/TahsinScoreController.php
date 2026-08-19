<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TahsinScore;
use Illuminate\Http\Request;

/**
 * Tahsin (perbaikan bacaan Al-Quran) — beda dari Nilai Akademik, SEMUA guru
 * boleh mencatat untuk siswa/kelas manapun (tidak dikunci ke Tugas Mengajar
 * mapel tertentu), karena bimbingan Tahsin bukan bagian dari 1 mapel spesifik.
 * Juga tidak terikat tahun ajaran — progres bacaan Al-Quran murid berjalan
 * terus lintas tahun, bukan sesuatu yang "reset" tiap ganti tahun ajaran.
 */
class TahsinScoreController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'student_id' => 'nullable|exists:students,id',
        ]);

        return TahsinScore::with(['student.user', 'student.classRoom', 'recordedBy'])
            ->when(!empty($data['class_room_id']), fn ($q) => $q->whereHas('student', fn ($q2) => $q2->where('class_room_id', $data['class_room_id'])))
            ->when(!empty($data['student_id']), fn ($q) => $q->where('student_id', $data['student_id']))
            ->orderByDesc('tanggal')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Simpan setoran Tahsin untuk beberapa siswa sekaligus dalam 1 tanggal —
     * beda dari AcademicScore::storeBulk, tiap siswa punya jilid/halaman/skor
     * SENDIRI-SENDIRI (bukan 1 kegiatan yang sama untuk semua), jadi baris
     * yang tidak diisi guru cukup TIDAK dikirim sama sekali (bukan default 0).
     */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'tanggal' => 'required|date',
            'entries' => 'required|array|min:1',
            'entries.*.student_id' => 'required|exists:students,id',
            'entries.*.jilid' => 'required|integer|min:1|max:6',
            'entries.*.halaman' => 'required|integer|min:1',
            'entries.*.keterangan' => 'nullable|string|max:255',
        ]);

        foreach ($data['entries'] as $entry) {
            TahsinScore::create([
                'student_id' => $entry['student_id'],
                'jilid' => $entry['jilid'],
                'halaman' => $entry['halaman'],
                'keterangan' => $entry['keterangan'] ?? null,
                'tanggal' => $data['tanggal'],
                'recorded_by' => $request->user()->id,
            ]);
        }

        return response()->json(['message' => count($data['entries']) . ' catatan Tahsin berhasil disimpan.'], 201);
    }

    public function update(Request $request, TahsinScore $tahsinScore)
    {
        if ($tahsinScore->recorded_by !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh mengubah catatan Tahsin yang Anda catat sendiri.'], 403);
        }

        $data = $request->validate([
            'jilid' => 'required|integer|min:1|max:6',
            'halaman' => 'required|integer|min:1',
            'keterangan' => 'nullable|string|max:255',
            'tanggal' => 'required|date',
        ]);

        $tahsinScore->update($data);

        return $tahsinScore->fresh('student.user');
    }

    public function destroy(Request $request, TahsinScore $tahsinScore)
    {
        if ($tahsinScore->recorded_by !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh menghapus catatan Tahsin yang Anda catat sendiri.'], 403);
        }

        $tahsinScore->delete();

        return response()->json(['message' => 'Catatan Tahsin dihapus.']);
    }

    public function myScores(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json([]);
        }

        return TahsinScore::where('student_id', $student->id)
            ->orderByDesc('tanggal')
            ->get();
    }
}
