<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PerpustakaanKategori;
use Illuminate\Http\Request;

/**
 * Master data kategori buku — kategori dipilih dari daftar ini saat tambah
 * buku (bukan ketik bebas), pola sama ViolationTypeController.
 */
class PerpustakaanKategoriController extends Controller
{
    public function index()
    {
        return PerpustakaanKategori::orderBy('nama')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:80|unique:perpustakaan_kategori,nama',
        ]);

        return response()->json(PerpustakaanKategori::create($data), 201);
    }

    public function update(Request $request, PerpustakaanKategori $kategori)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:80|unique:perpustakaan_kategori,nama,' . $kategori->id,
        ]);

        $kategori->update($data);

        return $kategori->fresh();
    }

    public function destroy(PerpustakaanKategori $kategori)
    {
        if ($kategori->buku()->exists()) {
            return response()->json([
                'message' => 'Kategori ini masih dipakai oleh buku, tidak bisa dihapus.',
            ], 422);
        }

        $kategori->delete();

        return response()->json(['message' => 'Kategori dihapus.']);
    }
}
