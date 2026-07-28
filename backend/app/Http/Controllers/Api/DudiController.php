<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dudi;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DudiController extends Controller
{
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
            'email'            => 'required|email|unique:users,email',
            'password'         => 'required|min:6',
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'nullable|numeric|between:-90,90',
            'longitude'        => 'nullable|numeric|between:-180,180',
            'radius_meter'     => 'nullable|integer|min:10|max:5000',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => bcrypt($data['password']),
                'role'     => 'dudi',
            ]);

            $dudi = Dudi::create([
                'user_id'          => $user->id,
                'nama_perusahaan'  => $data['nama_perusahaan'],
                'alamat'           => $data['alamat'] ?? null,
                'penanggung_jawab' => $data['penanggung_jawab'] ?? null,
                'telepon'          => $data['telepon'] ?? null,
                'latitude'         => $data['latitude'] ?? null,
                'longitude'        => $data['longitude'] ?? null,
                'radius_meter'     => $data['radius_meter'] ?? null,
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
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'sometimes|numeric|between:-90,90',
            'longitude'        => 'sometimes|numeric|between:-180,180',
            'radius_meter'     => 'sometimes|integer|min:10|max:5000',
        ]);

        if (isset($data['name'])) {
            $dudi->user->update(['name' => $data['name']]);
        }

        $dudi->update(collect($data)->except('name')->all());

        return $dudi->fresh('user');
    }

    public function destroy(Dudi $dudi)
    {
        $dudi->user->delete();
        return response()->json(['message' => 'Akun DUDI dihapus.']);
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
        return $dudi;
    }
}
