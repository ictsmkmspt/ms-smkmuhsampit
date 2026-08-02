<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class TuController extends Controller
{
    public function index()
    {
        return User::where('role', 'tu')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password']),
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
}
