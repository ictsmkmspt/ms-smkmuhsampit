<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PerpustakaanRak;
use Illuminate\Http\Request;

/**
 * Master data rak/lokasi buku — pola identik PerpustakaanKategoriController.
 */
class PerpustakaanRakController extends Controller
{
    public function index()
    {
        return PerpustakaanRak::orderBy('nama')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:50|unique:perpustakaan_rak,nama',
        ]);

        return response()->json(PerpustakaanRak::create($data), 201);
    }

    public function update(Request $request, PerpustakaanRak $rak)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:50|unique:perpustakaan_rak,nama,' . $rak->id,
        ]);

        $rak->update($data);

        return $rak->fresh();
    }

    public function destroy(PerpustakaanRak $rak)
    {
        if ($rak->buku()->exists()) {
            return response()->json([
                'message' => 'Rak ini masih dipakai oleh buku, tidak bisa dihapus.',
            ], 422);
        }

        $rak->delete();

        return response()->json(['message' => 'Rak dihapus.']);
    }
}
