<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login pakai email ATAU nomor HP — dipakai bareng: siswa/guru/admin/IDUKA
     * biasanya pakai email, sedangkan wali (orang tua) khusus pakai nomor HP
     * (akun wali sengaja tidak punya email sama sekali).
     */
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required',
        ]);

        $identifier = trim($request->login);
        $user = User::where('email', $identifier)->orWhere('phone', $identifier)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Email/No. HP atau password salah.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'must_change_password' => $request->password === '123456',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Berhasil logout.']);
    }

    /**
     * Ganti password akun sendiri — dipakai semua peran (Guru, Siswa, IDUKA, dst),
     * jadi cukup 1 endpoint umum, tidak perlu diulang per role.
     */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required',
            'new_password'     => 'required|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password saat ini salah.'],
            ]);
        }

        $user->update(['password' => bcrypt($data['new_password'])]);

        return response()->json(['message' => 'Password berhasil diganti.']);
    }
}
