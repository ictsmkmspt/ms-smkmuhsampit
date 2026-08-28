<?php

namespace App\Http\Controllers\Api;

use App\Exports\TeacherTemplateExport;
use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Imports\TeachersImport;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class TeacherController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return Teacher::with('user')->get();
    }

    /**
     * Rute ini terdaftar terpisah (bukan lewat apiResource) di api.php —
     * tetap diimplementasikan supaya tidak error 500 kalau dipanggil.
     */
    public function show(Teacher $teacher)
    {
        return $teacher->load('user');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'nullable|min:6',
            'nip' => 'required|string|unique:teachers,nip',
            'jenis_kelamin' => 'nullable|in:L,P',
            'max_jam_mengajar' => 'nullable|integer|min:0|max:60',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => bcrypt($data['password'] ?? '123456'),
                'role' => 'guru',
            ]);

            return Teacher::create([
                'user_id' => $user->id,
                'nip' => $data['nip'],
                'qr_code' => 'GRU-' . strtoupper(Str::random(8)),
                'jenis_kelamin' => $data['jenis_kelamin'] ?? null,
                'max_jam_mengajar' => $data['max_jam_mengajar'] ?? null,
            ])->load('user');
        });
    }

    public function update(Request $request, Teacher $teacher)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $teacher->user_id,
            'nip' => 'sometimes|string|unique:teachers,nip,' . $teacher->id,
            'jenis_kelamin' => 'nullable|in:L,P',
            'max_jam_mengajar' => 'nullable|integer|min:0|max:60',
        ]);

        if (isset($data['name']) || isset($data['email'])) {
            $teacher->user->update(array_intersect_key($data, array_flip(['name', 'email'])));
        }
        $teacher->update($request->only('nip', 'jenis_kelamin', 'max_jam_mengajar'));

        return $teacher->load('user');
    }

    public function destroy(Teacher $teacher)
    {
        // Sama seperti StudentController::destroy — peminjam_id di
        // perpustakaan_peminjaman tidak punya FK, jadi guru yang masih
        // pinjam buku dicegah dihapus supaya eksemplarnya tidak terkunci
        // "dipinjam" selamanya tanpa ada yang bisa memprosesnya.
        if ($teacher->peminjamanPerpustakaan()->where('status', 'dipinjam')->exists()) {
            return response()->json(['message' => 'Guru ini masih meminjam buku perpustakaan — proses pengembaliannya dulu sebelum menghapus akun.'], 422);
        }

        $teacher->user->delete();
        return response()->json(['message' => 'Guru dihapus.']);
    }

    public function resetPassword(Teacher $teacher)
    {
        $this->resetToDefaultPassword($teacher->user);
        return response()->json(['message' => 'Password guru "' . $teacher->user->name . '" berhasil direset ke default (123456).']);
    }

    public function downloadTemplate()
    {
        return Excel::download(new TeacherTemplateExport, 'template_import_guru.xlsx');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $import = new TeachersImport;
        Excel::import($import, $request->file('file'));

        $gagal = [];
        foreach ($import->failures() as $failure) {
            $gagal[] = [
                'baris'  => $failure->row(),
                'kolom'  => $failure->attribute(),
                'alasan' => implode(' ', $failure->errors()),
            ];
        }

        return response()->json([
            'message'  => $import->successCount . ' guru berhasil diimport, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal'    => $gagal,
        ]);
    }
}
