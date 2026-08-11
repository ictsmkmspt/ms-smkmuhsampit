<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Models\Dudi;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DudiController extends Controller
{
    use ResetsPasswordToDefault;


    /**
     * Daftar semua DUDI (dipakai admin untuk kelola daftar, dan sebagai
     * pilihan dropdown saat membuat penempatan PKL).
     */
    public function index()
    {
        return Dudi::with('user')->orderBy('nama_perusahaan')->get();
    }

    /**
     * Buat akun DUDI baru sekaligus profilnya (lokasi + radius) dalam 1 transaksi,
     * mengikuti pola yang sama seperti StudentController/TeacherController.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:100',
            'telepon'          => 'required|string|max:30|unique:users,phone',
            'password'         => 'nullable|min:6',
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'radius_meter'     => 'required|integer|min:10|max:5000',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['name'],
                'phone'    => $data['telepon'],
                'password' => bcrypt($data['password'] ?? '123456'),
                'role'     => 'dudi',
            ]);

            $dudi = Dudi::create([
                'user_id'          => $user->id,
                'nama_perusahaan'  => $data['nama_perusahaan'],
                'alamat'           => $data['alamat'] ?? null,
                'penanggung_jawab' => $data['penanggung_jawab'] ?? null,
                'telepon'          => $data['telepon'],
                'latitude'         => $data['latitude'],
                'longitude'        => $data['longitude'],
                'radius_meter'     => $data['radius_meter'],
            ]);

            return response()->json($dudi->load('user'), 201);
        });
    }

    public function update(Request $request, Dudi $dudi)
    {
        $data = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'nama_perusahaan'  => 'sometimes|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'telepon'          => ['sometimes', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($dudi->user_id)],
            'latitude'         => 'sometimes|numeric|between:-90,90',
            'longitude'        => 'sometimes|numeric|between:-180,180',
            'radius_meter'     => 'sometimes|integer|min:10|max:5000',
        ]);

        if (isset($data['name'])) {
            $dudi->user->update(['name' => $data['name']]);
        }
        // telepon = akun login DUDI (users.phone) — disinkronkan tiap kali
        // admin mengubahnya di sini, bukan cuma disimpan di profil dudis.
        if (isset($data['telepon'])) {
            $dudi->user->update(['phone' => $data['telepon']]);
        }

        $dudi->update(collect($data)->except('name')->all());

        return $dudi->fresh('user');
    }

    public function destroy(Dudi $dudi)
    {
        $dudi->user->delete();
        return response()->json(['message' => 'Akun DUDI dihapus.']);
    }

    public function resetPassword(Dudi $dudi)
    {
        $this->resetToDefaultPassword($dudi->user);
        return response()->json(['message' => 'Password akun IDUKA "' . $dudi->nama_perusahaan . '" berhasil direset ke default (123456).']);
    }

    /**
     * Profil DUDI yang sedang login (dipakai halaman dashboard DUDI).
     */
    public function myProfile(Request $request)
    {
        $dudi = $request->user()->dudi;
        if (!$dudi) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil DUDI.'], 404);
        }
        return $dudi->load('user');
    }

    /**
     * DUDI mengubah data profilnya sendiri (bukan admin) — dipakai menu
     * "Edit Profil" di dashboard DUDI. Sengaja dibatasi cuma nama instruktur
     * & no HP (bukan nama perusahaan/alamat, itu data resmi yang tetap
     * dikelola admin lewat Master Data > DUDI). No HP wajib diisi (bukan
     * nullable lagi) karena itu sekaligus akun login (users.phone) —
     * mengosongkannya akan mengunci akun ini sendiri. Sengaja tidak
     * termasuk password di sini juga, itu urusan terpisah.
     */
    public function updateProfile(Request $request)
    {
        $dudi = $request->user()->dudi;
        if (!$dudi) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil DUDI.'], 404);
        }

        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'telepon' => ['required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($dudi->user_id)],
        ]);

        $dudi->user->update(['name' => $data['name'], 'phone' => $data['telepon']]);
        $dudi->update(['telepon' => $data['telepon']]);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'dudi'    => $dudi->fresh('user'),
        ]);
    }

    /**
     * DUDI mengunggah/mengganti gambar tanda tangannya sendiri. Gambar ini
     * dipakai menggantikan tanda centang (✓) di kolom paraf pada halaman
     * cetak jurnal, begitu DUDI memverifikasi absensi/catatan bimbingan.
     */
    public function uploadTandaTangan(Request $request)
    {
        $dudi = $request->user()->dudi;
        if (!$dudi) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil DUDI.'], 404);
        }

        $request->validate([
            'tanda_tangan' => 'required|image|max:2048',
        ]);

        // Hapus file lama dulu (kalau ada) supaya tidak menumpuk file tak terpakai.
        if ($dudi->tanda_tangan) {
            Storage::disk('public')->delete($dudi->tanda_tangan);
        }

        $path = $request->file('tanda_tangan')->store('tanda-tangan', 'public');
        $dudi->update(['tanda_tangan' => $path]);

        return response()->json([
            'message' => 'Tanda tangan berhasil disimpan.',
            'dudi'    => $dudi->fresh('user'),
        ]);
    }
}
