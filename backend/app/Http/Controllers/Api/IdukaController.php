<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Iduka;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class IdukaController extends Controller
{
    /**
     * Daftar semua IDUKA (dipakai admin untuk kelola daftar, dan sebagai
     * pilihan dropdown saat membuat penempatan PKL).
     */
    public function index()
    {
        return Iduka::with('user')->orderBy('nama_perusahaan')->get();
    }

    /**
     * Buat akun IDUKA baru sekaligus profilnya (lokasi + radius) dalam 1 transaksi,
     * mengikuti pola yang sama seperti StudentController/TeacherController.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:100',
            'email'            => 'required|email|unique:users,email',
            'password'         => 'required|min:6',
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'radius_meter'     => 'required|integer|min:10|max:5000',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => bcrypt($data['password']),
                'role'     => 'iduka',
            ]);

            $iduka = Iduka::create([
                'user_id'          => $user->id,
                'nama_perusahaan'  => $data['nama_perusahaan'],
                'alamat'           => $data['alamat'] ?? null,
                'penanggung_jawab' => $data['penanggung_jawab'] ?? null,
                'telepon'          => $data['telepon'] ?? null,
                'latitude'         => $data['latitude'],
                'longitude'        => $data['longitude'],
                'radius_meter'     => $data['radius_meter'],
            ]);

            return response()->json($iduka->load('user'), 201);
        });
    }

    public function update(Request $request, Iduka $iduka)
    {
        $data = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'nama_perusahaan'  => 'sometimes|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'sometimes|numeric|between:-90,90',
            'longitude'        => 'sometimes|numeric|between:-180,180',
            'radius_meter'     => 'sometimes|integer|min:10|max:5000',
        ]);

        if (isset($data['name'])) {
            $iduka->user->update(['name' => $data['name']]);
        }

        $iduka->update(collect($data)->except('name')->all());

        return $iduka->fresh('user');
    }

    public function destroy(Iduka $iduka)
    {
        $iduka->user->delete();
        return response()->json(['message' => 'Akun IDUKA dihapus.']);
    }

    /**
     * Profil IDUKA yang sedang login (dipakai halaman dashboard IDUKA).
     */
    public function myProfile(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }
        return $iduka;
    }

    /**
     * IDUKA mengubah data profil perusahaannya sendiri (bukan admin) — dipakai
     * menu "Edit Profil" di dashboard IDUKA. Sengaja tidak termasuk email/password
     * di sini, itu urusan terpisah supaya tidak tercampur dengan data profil biasa.
     */
    public function updateProfile(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }

        $data = $request->validate([
            'nama_perusahaan'  => 'sometimes|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'telepon'          => 'nullable|string|max:30',
        ]);

        $iduka->update($data);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'iduka'   => $iduka->fresh(),
        ]);
    }

    /**
     * IDUKA mengunggah/mengganti gambar tanda tangannya sendiri. Gambar ini
     * dipakai menggantikan tanda centang (✓) di kolom paraf pada halaman
     * cetak jurnal, begitu IDUKA memverifikasi absensi/catatan bimbingan.
     */
    public function uploadTandaTangan(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }

        $request->validate([
            'tanda_tangan' => 'required|image|max:2048',
        ]);

        // Hapus file lama dulu (kalau ada) supaya tidak menumpuk file tak terpakai.
        if ($iduka->tanda_tangan) {
            Storage::disk('public')->delete($iduka->tanda_tangan);
        }

        $path = $request->file('tanda_tangan')->store('tanda-tangan', 'public');
        $iduka->update(['tanda_tangan' => $path]);

        return response()->json([
            'message' => 'Tanda tangan berhasil disimpan.',
            'iduka'   => $iduka->fresh(),
        ]);
    }
}
