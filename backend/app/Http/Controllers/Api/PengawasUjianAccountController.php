<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

// Kelola akun Pengawas Ujian oleh Admin — pola sama persis dengan
// PustakawanController, role ini juga tidak terikat ruang/mapel/kelas
// manapun (pengawas memantau SEMUA ujian & latihan yang sedang berlangsung
// di seluruh sekolah, lihat CbtPengawasController).
class PengawasUjianAccountController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return User::where('role', 'pengawas_ujian')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'nullable|min:6',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => 'pengawas_ujian',
            'password' => bcrypt($data['password'] ?? '123456'),
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::where('role', 'pengawas_ujian')->findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,' . $user->id,
        ]);

        $user->update($data);

        return $user->fresh();
    }

    public function destroy($id)
    {
        $user = User::where('role', 'pengawas_ujian')->findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Akun dihapus.']);
    }

    public function resetPassword($id)
    {
        $user = User::where('role', 'pengawas_ujian')->findOrFail($id);
        $this->resetToDefaultPassword($user);

        return response()->json(['message' => 'Password akun "' . $user->name . '" berhasil direset ke default (123456).']);
    }
}
