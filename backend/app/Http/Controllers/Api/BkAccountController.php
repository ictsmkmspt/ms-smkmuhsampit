<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class BkAccountController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return User::where('role', 'bk')->get();
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
            'role' => 'bk',
        ]);

        return response()->json($user, 201);
    }

    public function destroy($id)
    {
        $user = User::where('role', 'bk')->findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Akun BK dihapus.']);
    }

    public function resetPassword($id)
    {
        $user = User::where('role', 'bk')->findOrFail($id);
        $this->resetToDefaultPassword($user);
        return response()->json(['message' => 'Password akun BK "' . $user->name . '" berhasil direset ke default (123456).']);
    }
}
