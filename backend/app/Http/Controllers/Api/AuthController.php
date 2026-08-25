<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Student;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\User;
use App\Services\ActivityLogger;
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

        return $this->respondWithLogin($user, $request->password);
    }

    /**
     * Login khusus alumni pakai NIS (bukan email/no. HP seperti login()
     * biasa) — dipakai halaman /bursakerjakhusus/masuk. Cuma siswa
     * berstatus "lulus" (alumni) yang boleh lewat sini; siswa aktif tetap
     * login lewat email/no. HP seperti biasa.
     */
    public function loginNis(Request $request)
    {
        $request->validate([
            'nis' => 'required|string',
            'password' => 'required',
        ]);

        $student = Student::where('nis', trim($request->nis))->where('status', 'lulus')->first();
        $user = $student?->user;

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'nis' => ['NIS atau password salah.'],
            ]);
        }

        return $this->respondWithLogin($user, $request->password);
    }

    /**
     * Bagian bersama login()/loginNis() setelah kredensial terverifikasi:
     * cek maintenance mode, cek status persetujuan IDUKA (kalau role
     * 'iduka' dan belum "aktif" — mis. masih "menunggu" persetujuan BKK
     * atau sudah "ditolak" — TOLAK di sini, di server, supaya tidak bisa
     * dilewati dari jalur manapun), lalu terbitkan token.
     */
    private function respondWithLogin(User $user, string $rawPassword)
    {
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

        if ($user->role === 'iduka') {
            $iduka = $user->iduka;
            if ($iduka && $iduka->status === 'menunggu') {
                throw ValidationException::withMessages([
                    'login' => ['Akun Anda masih menunggu persetujuan tim BKK.'],
                ]);
            }
            if ($iduka && $iduka->status === 'ditolak') {
                throw ValidationException::withMessages([
                    'login' => ['Pendaftaran ditolak: ' . ($iduka->catatan_verifikasi ?? 'hubungi BKK untuk info lebih lanjut.')],
                ]);
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // auth()->user() belum terisi di sini (rute /login publik, belum
        // ada token) — sisipkan identitas user manual lewat $extra.
        ActivityLogger::catat('login', extra: [
            'user_id' => $user->id, 'actor_nama' => $user->name, 'actor_role' => $user->role,
        ]);

        return response()->json([
            'user' => $this->withGuruFlags($user),
            'token' => $token,
            'must_change_password' => $rawPassword === '123456',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->withGuruFlags($request->user()));
    }

    public function logout(Request $request)
    {
        ActivityLogger::catat('logout');
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
