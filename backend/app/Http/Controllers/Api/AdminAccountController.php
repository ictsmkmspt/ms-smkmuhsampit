<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AdminAccountController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return User::whereIn('role', ['admin', 'waka'])->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'nullable|min:6',
            'role' => 'required|in:admin,waka',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password'] ?? '123456'),
            'role' => $data['role'],
        ]);

        return response()->json($user, 201);
    }

    /**
     * Hapus akun Super Admin/Admin. Ditolak kalau targetnya akun yang sedang
     * login sendiri (supaya tidak tiba-tiba logout paksa di tengah sesi), dan
     * ditolak kalau targetnya Super Admin TERAKHIR (supaya sistem tidak
     * pernah kehabisan akun admin penuh sama sekali).
     */
    public function destroy(Request $request, $id)
    {
        $user = User::whereIn('role', ['admin', 'waka'])->findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Tidak bisa menghapus akun yang sedang Anda pakai sendiri.'], 422);
        }

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Tidak bisa menghapus Super Admin terakhir — sistem wajib punya minimal 1 akun Super Admin.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Akun berhasil dihapus.']);
    }

    public function resetPassword($id)
    {
        $user = User::whereIn('role', ['admin', 'waka'])->findOrFail($id);
        $this->resetToDefaultPassword($user);
        return response()->json(['message' => 'Password akun "' . $user->name . '" berhasil direset ke default (123456).']);
    }
}
