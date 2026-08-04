<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class TuController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return User::where('role', 'tu')->get();
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
            'password' => bcrypt($data['password'] ?? '123456'),
            'role' => 'tu',
        ]);

        return response()->json($user, 201);
    }

    public function destroy($id)
    {
        $user = User::where('role', 'tu')->findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Akun TU dihapus.']);
    }

    public function resetPassword($id)
    {
        $user = User::where('role', 'tu')->findOrFail($id);
        $this->resetToDefaultPassword($user);
        return response()->json(['message' => 'Password akun TU "' . $user->name . '" berhasil direset ke default (123456).']);
    }
}
