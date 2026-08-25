<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassRoomController extends Controller
{
    /**
     * Default cuma kelas aktif. Kirim ?status=lulus untuk daftar "kelas
     * alumni" (dipakai menu Alumni), atau ?status=semua untuk keduanya.
     * Jumlah siswa yang dihitung ikut menyesuaikan status yang diminta.
     */
    public function index(Request $request)
    {
        $status = $request->query('status', 'aktif');
        $hitungStatus = $status === 'semua' ? 'aktif' : $status;

        $query = ClassRoom::withCount(['students' => fn ($q) => $q->where('status', $hitungStatus)])
            ->with('homeroomTeacher.user');

        if ($status !== 'semua') {
            $query->where('status', $status);
        }

        // Kelas aktif: kecil ke besar (X, XI, XII — tingkat rendah dulu).
        // Kelas alumni: nama depannya tahun lulus (mis. "2026 XII TKJ 1"),
        // besar ke kecil supaya tahun terbaru tampil duluan.
        $query->orderBy('name', $status === 'lulus' ? 'desc' : 'asc');

        return $query->get();
    }

    /**
     * apiResource mendaftarkan rute ini otomatis (GET /classes/{classRoom})
     * meski frontend belum pernah memanggilnya — tetap diimplementasikan
     * supaya rute yang sudah terdaftar tidak error 500 kalau suatu saat
     * dipakai (mis. lewat link langsung atau fitur baru).
     */
    public function show($id)
    {
        $classRoom = ClassRoom::with('homeroomTeacher.user')->findOrFail($id);
        $classRoom->setAttribute('students_count', $classRoom->students()->where('status', 'aktif')->count());
        return $classRoom;
    }

    /**
     * `status` opsional (default "aktif") — dipakai menu Alumni buat bikin
     * "kelas alumni" LANGSUNG berstatus "lulus" (mis. mengarsipkan
     * angkatan lama yang belum pernah tercatat sebagai kelas aktif di
     * sistem ini), tanpa harus lewat alur luluskan() satu kelas aktif.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:50',
            'status' => 'nullable|in:aktif,lulus',
            'homeroom_teacher_id' => [
                'nullable',
                'exists:teachers,id',
                Rule::unique('class_rooms', 'homeroom_teacher_id'),
            ],
        ], [
            'homeroom_teacher_id.unique' => 'Guru ini sudah menjadi wali kelas di kelas lain.',
        ]);

        $classRoom = ClassRoom::create($data);

        $classRoom->load('homeroomTeacher.user');
        $classRoom->setAttribute('students_count', $classRoom->students()->count());

        return $classRoom;
    }

    // Catatan: sengaja pakai $id biasa (bukan route-model-binding ClassRoom $classRoom)
    // lalu cari manual dengan findOrFail, supaya tidak bergantung pada binding otomatis Laravel.
    public function update(Request $request, $id)
    {
        $classRoom = ClassRoom::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:50',
            'homeroom_teacher_id' => [
                'sometimes',
                'nullable',
                'exists:teachers,id',
                Rule::unique('class_rooms', 'homeroom_teacher_id')->ignore($classRoom->id),
            ],
        ], [
            'homeroom_teacher_id.unique' => 'Guru ini sudah menjadi wali kelas di kelas lain.',
        ]);

        $classRoom->update($data);

        $classRoom->load('homeroomTeacher.user');
        $classRoom->setAttribute('students_count', $classRoom->students()->count());

        return $classRoom;
    }

    public function destroy($id)
    {
        $classRoom = ClassRoom::findOrFail($id);
        $classRoom->delete();
        return response()->json(['message' => 'Kelas dihapus.']);
    }

    /**
     * Luluskan semua siswa AKTIF di kelas ini sekaligus, sekaligus tandai
     * kelasnya sendiri jadi "lulus" — dipakai admin pas kenaikan/kelulusan
     * angkatan. Kelas yang sudah lulus otomatis hilang dari daftar Kelas
     * aktif (pindah ke menu Alumni), tapi datanya tidak dihapus supaya
     * riwayat "kelas asal" alumni tetap valid.
     *
     * `name` (opsional) — nama kelas diganti sekalian (mis. digabung
     * dengan tahun lulus jadi "2026 XII TKJ 1") supaya nama angkatan
     * lulusnya jelas di riwayat, bukan cuma "XII TKJ 1" polos yang bisa
     * dipakai ulang kelas aktif berikutnya. `tanggal_lulus` (opsional)
     * — default hari ini kalau tidak diisi, tapi admin boleh set tanggal
     * kelulusan resmi yang beda dari tanggal proses di sistem.
     */
    public function luluskan(Request $request, $id)
    {
        $classRoom = ClassRoom::findOrFail($id);

        $data = $request->validate([
            'name'          => 'nullable|string|max:100',
            'tanggal_lulus' => 'nullable|date',
        ]);

        $tanggalLulus = $data['tanggal_lulus'] ?? now()->toDateString();

        $diluluskan = Student::where('class_room_id', $classRoom->id)
            ->where('status', 'aktif')
            ->update(['status' => 'lulus', 'tanggal_lulus' => $tanggalLulus]);

        $classRoom->update([
            'status' => 'lulus',
            'name'   => $data['name'] ?? $classRoom->name,
        ]);

        return response()->json([
            'message' => "Berhasil meluluskan {$diluluskan} siswa di kelas {$classRoom->name}.",
            'diluluskan' => $diluluskan,
        ]);
    }

    /**
     * Kebalikan dari luluskan() — aktifkan lagi kelas ini beserta semua
     * siswa lulus di dalamnya. Dipakai kalau ternyata salah luluskan
     * satu kelas penuh (misal salah pilih kelas).
     */
    public function aktifkan($id)
    {
        $classRoom = ClassRoom::findOrFail($id);

        $diaktifkan = Student::where('class_room_id', $classRoom->id)
            ->where('status', 'lulus')
            ->update(['status' => 'aktif', 'tanggal_lulus' => null]);

        $classRoom->update(['status' => 'aktif']);

        return response()->json([
            'message' => "Berhasil mengaktifkan {$diaktifkan} siswa di kelas {$classRoom->name}.",
            'diaktifkan' => $diaktifkan,
        ]);
    }
}
