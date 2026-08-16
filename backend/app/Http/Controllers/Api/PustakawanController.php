<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

// Kelola akun Pengurus Perpustakaan oleh Admin — pola sama persis dengan
// RoomStaffController (teknisi/kepala_bengkel), cuma role ini tidak terikat
// ruang manapun jadi tidak ada logic room_id sama sekali.
class PustakawanController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return User::where('role', 'pustakawan')->orderBy('name')->get();
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
            'role' => 'pustakawan',
            'password' => bcrypt($data['password'] ?? '123456'),
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::where('role', 'pustakawan')->findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,' . $user->id,
        ]);

        $user->update($data);

        return $user->fresh();
    }

    public function destroy($id)
    {
        $user = User::where('role', 'pustakawan')->findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Akun dihapus.']);
    }

    public function resetPassword($id)
    {
        $user = User::where('role', 'pustakawan')->findOrFail($id);
        $this->resetToDefaultPassword($user);

        return response()->json(['message' => 'Password akun "' . $user->name . '" berhasil direset ke default (123456).']);
    }
}
