<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

// Kelola akun Teknisi & Kepala Bengkel. Kepala Bengkel ditugaskan ke tepat 1
// Ruang (dibatasi cuma ke ruang itu — lihat RestrictsToOwnRoom). Teknisi
// SENGAJA tidak terikat ruang manapun — bisa bantu inventaris di ruang mana
// saja, jadi room_id-nya opsional/boleh kosong.
class RoomStaffController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return User::whereIn('role', ['teknisi', 'kepala_bengkel'])->with('room')->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:teknisi,kepala_bengkel',
            'room_id' => 'required_if:role,kepala_bengkel|nullable|exists:rooms,id',
            'password' => 'nullable|min:6',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'room_id' => $data['role'] === 'teknisi' ? null : $data['room_id'],
            'password' => bcrypt($data['password'] ?? '123456'),
        ]);

        return response()->json($user->load('room'), 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::whereIn('role', ['teknisi', 'kepala_bengkel'])->findOrFail($id);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'room_id' => $user->role === 'kepala_bengkel' ? 'required|exists:rooms,id' : 'nullable|exists:rooms,id',
        ]);

        $data['room_id'] = $user->role === 'teknisi' ? ($data['room_id'] ?? null) : $data['room_id'];

        $user->update($data);

        return $user->fresh('room');
    }

    public function destroy($id)
    {
        $user = User::whereIn('role', ['teknisi', 'kepala_bengkel'])->findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Akun dihapus.']);
    }

    public function resetPassword($id)
    {
        $user = User::whereIn('role', ['teknisi', 'kepala_bengkel'])->findOrFail($id);
        $this->resetToDefaultPassword($user);

        return response()->json(['message' => 'Password akun "' . $user->name . '" berhasil direset ke default (123456).']);
    }
}
