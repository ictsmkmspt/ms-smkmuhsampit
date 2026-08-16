<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Tambahkan flag is_wali_kelas & is_pembimbing_pkl khusus untuk guru —
     * dipakai frontend (GuruDashboard) buat menyembunyikan menu Laporan &
     * PKL kalau guru yang login tidak ditugaskan sebagai wali kelas / tidak
     * sedang membimbing siswa PKL manapun di tahun ajaran aktif.
     */
    private function withGuruFlags(User $user): User|array
    {
        if ($user->role !== 'guru') {
            return $user;
        }

        $teacher = Teacher::where('user_id', $user->id)->first();

        $data = $user->toArray();
        $data['is_wali_kelas'] = $teacher ? $teacher->homeroomOf()->exists() : false;
        $data['is_pembimbing_pkl'] = $teacher
            ? $teacher->pklPlacements()->where('tahun_ajaran_id', TahunAjaran::aktifId())->exists()
            : false;

        return $data;
    }

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

        // Baru bisa dicek SETELAH kredensial benar (role-nya belum tahu
        // sebelum ini) — non-admin ditolak TOTAL selama maintenance nyala,
        // bukan cuma login-lalu-diblokir endpoint lain (lihat juga
        // CheckMaintenanceMode yang menegakkan ini utk seluruh endpoint lain).
        if ($user->role !== 'admin' && Setting::get('maintenance_mode', '0') === '1') {
            return response()->json([
                'message' => 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
                'maintenance' => true,
            ], 503);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $this->withGuruFlags($user),
            'token' => $token,
            'must_change_password' => $request->password === '123456',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->withGuruFlags($request->user()));
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
            'new_password'     => ['required', 'min:8', 'confirmed', 'regex:/[A-Z]/', 'regex:/[^A-Za-z0-9]/'],
        ], [
            'new_password.min' => 'Password baru minimal 8 karakter.',
            'new_password.regex' => 'Password baru wajib mengandung minimal 1 huruf besar dan 1 simbol.',
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
