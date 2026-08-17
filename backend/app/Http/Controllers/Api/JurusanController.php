<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jurusan;
use Illuminate\Http\Request;

/**
 * Master data jurusan siswa — dipilih dari daftar ini saat tambah/ubah
 * siswa (bukan ketik bebas), pola sama PerpustakaanKategoriController.
 * Menambah/mengubah/menghapus jurusan sengaja dibatasi Admin saja (dikelola
 * lewat menu Pengaturan), tapi daftar isinya (index) tetap boleh dibaca
 * Waka Kesiswaan supaya dropdown di form Siswa bisa terisi.
 */
class JurusanController extends Controller
{
    public function index()
    {
        return Jurusan::orderBy('nama')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kode' => 'required|string|max:20|unique:jurusans,kode',
            'nama' => 'required|string|max:80|unique:jurusans,nama',
        ]);

        return response()->json(Jurusan::create($data), 201);
    }

    public function update(Request $request, Jurusan $jurusan)
    {
        $data = $request->validate([
            'kode' => 'required|string|max:20|unique:jurusans,kode,' . $jurusan->id,
            'nama' => 'required|string|max:80|unique:jurusans,nama,' . $jurusan->id,
        ]);

        $jurusan->update($data);

        return $jurusan->fresh();
    }

    public function destroy(Jurusan $jurusan)
    {
        if ($jurusan->students()->exists()) {
            return response()->json([
                'message' => 'Jurusan ini masih dipakai oleh data siswa, tidak bisa dihapus.',
            ], 422);
        }

        $jurusan->delete();

        return response()->json(['message' => 'Jurusan dihapus.']);
    }
}
