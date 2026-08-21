<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CbtTujuanPembelajaran;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;

/**
 * Tujuan Pembelajaran (TP) — wadah pengelompokan Materi per mata
 * pelajaran (Kurikulum Merdeka). Guru bikin TP dulu, baru Materi ditulis
 * di dalamnya (lihat CbtMateriController).
 */
class CbtTpController extends Controller
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
        return CbtTujuanPembelajaran::where('teacher_id', $this->ownTeacherId($request))
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
            'judul' => 'required|string|max:150',
            'subject_id' => 'required|exists:subjects,id',
            'urutan' => 'nullable|integer|min:0',
        ]);

        if (!$this->isOwnSubject($request, $data['subject_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 403);
        }

        $data['teacher_id'] = $this->ownTeacherId($request);

        return response()->json(CbtTujuanPembelajaran::create($data), 201);
    }

    public function update(Request $request, CbtTujuanPembelajaran $cbtTp)
    {
        if ($cbtTp->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah TP ini.'], 403);
        }
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

    public function destroy(Request $request, CbtTujuanPembelajaran $cbtTp)
    {
        if ($cbtTp->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'TP ini milik tahun ajaran yang tidak aktif.'], 422);
        }
        if ($cbtTp->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus TP ini.'], 403);
        }
        if ($cbtTp->materiList()->exists()) {
            return response()->json(['message' => 'TP ini masih berisi Materi — pindahkan atau hapus dulu Materi di dalamnya.'], 422);
        }

        $cbtTp->delete();

        return response()->json(['message' => 'TP dihapus.']);
    }
}
