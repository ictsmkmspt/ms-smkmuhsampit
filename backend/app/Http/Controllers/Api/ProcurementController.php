<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Procurement;
use Illuminate\Http\Request;

class ProcurementController extends Controller
{
    public function index(Request $request)
    {
        $query = Procurement::orderByDesc('tanggal_pengajuan');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama_barang' => 'required|string|max:150',
            'jumlah' => 'required|integer|min:1',
            'alasan' => 'required|string',
            'tanggal_pengajuan' => 'required|date',
            'keterangan' => 'nullable|string',
        ]);

        $data['status'] = 'diajukan';

        return response()->json(Procurement::create($data), 201);
    }

    public function update(Request $request, Procurement $procurement)
    {
        $data = $request->validate([
            'status' => 'required|in:diajukan,disetujui,ditolak,dibeli',
            'tanggal_realisasi' => 'nullable|date',
            'keterangan' => 'nullable|string',
        ]);

        $procurement->update($data);

        return $procurement->fresh();
    }

    public function destroy(Procurement $procurement)
    {
        $procurement->delete();

        return response()->json(['message' => 'Pengajuan pengadaan dihapus.']);
    }
}
