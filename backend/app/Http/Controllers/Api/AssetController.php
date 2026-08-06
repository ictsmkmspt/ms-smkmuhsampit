<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $query = Asset::with('room')->orderBy('nama');

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }
        if ($request->filled('kondisi')) {
            $query->where('kondisi', $request->kondisi);
        }

        return $query->get();
    }

    public function findByBarcode(string $code)
    {
        $asset = Asset::with('room')->where('kode_aset', $code)->first();

        if (!$asset) {
            return response()->json([
                'message' => 'Barcode tidak dikenali / aset tidak ditemukan.',
            ], 404);
        }

        return response()->json($asset);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kode_aset' => 'required|string|max:50|unique:assets,kode_aset',
            'nama' => 'required|string|max:150',
            'kategori' => 'nullable|string|max:100',
            'kondisi' => 'required|in:baik,rusak_ringan,rusak_berat',
            'jumlah' => 'required|integer|min:1',
            'room_id' => 'nullable|exists:rooms,id',
            'tanggal_perolehan' => 'nullable|date',
            'keterangan' => 'nullable|string',
        ]);

        return response()->json(Asset::create($data)->load('room'), 201);
    }

    public function update(Request $request, Asset $asset)
    {
        $data = $request->validate([
            'kode_aset' => 'required|string|max:50|unique:assets,kode_aset,' . $asset->id,
            'nama' => 'required|string|max:150',
            'kategori' => 'nullable|string|max:100',
            'kondisi' => 'required|in:baik,rusak_ringan,rusak_berat',
            'jumlah' => 'required|integer|min:1',
            'room_id' => 'nullable|exists:rooms,id',
            'tanggal_perolehan' => 'nullable|date',
            'keterangan' => 'nullable|string',
        ]);

        $asset->update($data);

        return $asset->fresh('room');
    }

    public function destroy(Asset $asset)
    {
        if ($asset->maintenanceRequests()->exists()) {
            return response()->json(['message' => 'Aset ini masih punya riwayat pemeliharaan, tidak bisa dihapus.'], 422);
        }

        $asset->delete();

        return response()->json(['message' => 'Data aset dihapus.']);
    }
}
