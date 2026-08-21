<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\SaringHtmlCbt;
use App\Http\Controllers\Controller;
use App\Models\CbtMateri;
use App\Models\CbtTujuanPembelajaran;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Materi bacaan — versi Admin/Waka Kurikulum, lihat
 * AdminCbtQuestionController untuk penjelasan kenapa teacher_id datang
 * eksplisit dari request, bukan dari akun yang login. Beda dari
 * CbtMateriController::show() (dipakai siswa), show() di sini TIDAK
 * dibatasi status='terbit' — admin boleh lihat draf juga — dan TIDAK
 * menambah hits.
 */
class AdminCbtMateriController extends Controller
{
    use SaringHtmlCbt;

    private function tpMilikTeacher(int $tpId, int $teacherId): ?CbtTujuanPembelajaran
    {
        return CbtTujuanPembelajaran::where('id', $tpId)
            ->where('teacher_id', $teacherId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->first();
    }

    public function index(Request $request)
    {
        $data = $request->validate(['teacher_id' => 'required|exists:teachers,id']);

        return CbtMateri::where('teacher_id', $data['teacher_id'])
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with('subject', 'tp')
            ->withCount('latihan')
            ->orderByDesc('id')
            ->get();
    }

    public function show(CbtMateri $cbtMateri)
    {
        return $cbtMateri->fresh(['subject', 'tp', 'teacher.user']);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'judul' => 'required|string|max:150',
            'isi' => 'required|string|max:2000000',
            'tp_id' => 'required|exists:cbt_tujuan_pembelajaran,id',
            'status' => 'nullable|in:draft,terbit',
            'gambar' => 'nullable|image|max:2048',
        ]);

        $tp = $this->tpMilikTeacher($data['tp_id'], $data['teacher_id']);
        if (!$tp) {
            return response()->json(['message' => 'TP tidak ditemukan atau bukan milik guru ini.'], 422);
        }

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
        if ($cbtMateri->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Materi ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string|max:2000000',
            'tp_id' => 'required|exists:cbt_tujuan_pembelajaran,id',
            'status' => 'required|in:draft,terbit',
        ]);

        $tp = $this->tpMilikTeacher($data['tp_id'], $cbtMateri->teacher_id);
        if (!$tp) {
            return response()->json(['message' => 'TP tidak ditemukan atau bukan milik guru ini.'], 422);
        }
        $data['subject_id'] = $tp->subject_id;
        $data['isi'] = $this->saringHtml($data['isi']);

        $cbtMateri->update($data);

        return $cbtMateri->fresh();
    }

    public function uploadGambar(Request $request, CbtMateri $cbtMateri)
    {
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

    public function destroy(CbtMateri $cbtMateri)
    {
        if ($cbtMateri->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Materi ini milik tahun ajaran yang tidak aktif.'], 422);
        }

        if ($cbtMateri->gambar_path) {
            Storage::disk('public')->delete($cbtMateri->gambar_path);
        }
        $cbtMateri->delete();

        return response()->json(['message' => 'Materi dihapus.']);
    }
}
