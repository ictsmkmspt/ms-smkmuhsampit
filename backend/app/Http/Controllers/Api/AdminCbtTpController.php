<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CbtTujuanPembelajaran;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;

/**
 * Tujuan Pembelajaran (TP) — versi Admin/Waka Kurikulum, lihat
 * AdminCbtQuestionController untuk penjelasan kenapa teacher_id datang
 * eksplisit dari request, bukan dari akun yang login.
 */
class AdminCbtTpController extends Controller
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

        return CbtTujuanPembelajaran::where('teacher_id', $data['teacher_id'])
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with('subject')
            ->withCount('materiList')
            ->orderBy('subject_id')
            ->orderBy('urutan')
            ->orderBy('id')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'judul' => 'required|string|max:150',
            'subject_id' => 'required|exists:subjects,id',
            'urutan' => 'nullable|integer|min:0',
        ]);

        if (!$this->teacherPunyaMapel($data['teacher_id'], $data['subject_id'])) {
            return response()->json(['message' => 'Guru ini tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 422);
        }

        return response()->json(CbtTujuanPembelajaran::create($data), 201);
    }

    public function update(Request $request, CbtTujuanPembelajaran $cbtTp)
    {
        if ($cbtTp->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'TP ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'urutan' => 'nullable|integer|min:0',
        ]);

        $cbtTp->update($data);

        return $cbtTp->fresh();
    }

    public function destroy(CbtTujuanPembelajaran $cbtTp)
    {
        if ($cbtTp->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'TP ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtTp->materiList()->exists()) {
            return response()->json(['message' => 'TP ini masih berisi Materi — pindahkan atau hapus dulu Materi di dalamnya.'], 422);
        }

        $cbtTp->delete();

        return response()->json(['message' => 'TP dihapus.']);
    }
}
