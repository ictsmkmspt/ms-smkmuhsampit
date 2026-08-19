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

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:50',
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
     */
    public function luluskan($id)
    {
        $classRoom = ClassRoom::findOrFail($id);

        $diluluskan = Student::where('class_room_id', $classRoom->id)
            ->where('status', 'aktif')
            ->update(['status' => 'lulus', 'tanggal_lulus' => now()->toDateString()]);

        $classRoom->update(['status' => 'lulus']);

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
