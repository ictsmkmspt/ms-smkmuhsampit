<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class WaliController extends Controller
{
    /**
     * Daftar akun wali beserta anak-anak yang sudah terhubung.
     */
    public function index()
    {
        return User::where('role', 'wali')
            ->with(['children.user', 'children.classRoom'])
            ->get();
    }

    /**
     * Buat akun wali baru (belum terhubung ke anak manapun — dihubungkan lewat endpoint link()).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => bcrypt($data['password']),
            'role'     => 'wali',
        ]);

        return response()->json($user, 201);
    }

    /**
     * Hubungkan 1 akun wali ke 1 siswa (bisa dipanggil berkali-kali untuk hubungkan beberapa anak).
     */
    public function link(Request $request, $parentId)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'hubungan'   => 'nullable|string|max:50',
        ]);

        $parent = User::where('role', 'wali')->findOrFail($parentId);

        $parent->children()->syncWithoutDetaching([
            $data['student_id'] => ['hubungan' => $data['hubungan'] ?? null],
        ]);

        return response()->json(['message' => 'Siswa berhasil dihubungkan ke akun wali ini.']);
    }

    /**
     * Lepas hubungan 1 wali dari 1 anak (tidak menghapus akun/data siswanya, cuma relasinya).
     */
    public function unlink($parentId, $studentId)
    {
        $parent = User::where('role', 'wali')->findOrFail($parentId);
        $parent->children()->detach($studentId);

        return response()->json(['message' => 'Siswa dilepas dari akun wali ini.']);
    }

    public function destroy($id)
    {
        $parent = User::where('role', 'wali')->findOrFail($id);
        $parent->delete();

        return response()->json(['message' => 'Akun wali dihapus.']);
    }
}
