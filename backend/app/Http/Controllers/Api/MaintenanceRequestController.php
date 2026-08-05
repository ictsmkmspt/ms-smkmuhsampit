<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceRequest;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
    public function index(Request $request)
    {
        $query = MaintenanceRequest::with(['asset', 'room'])->orderByDesc('tanggal_lapor');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'asset_id' => 'nullable|exists:assets,id',
            'room_id' => 'nullable|exists:rooms,id',
            'deskripsi' => 'required|string',
            'pelapor' => 'nullable|string|max:100',
            'tanggal_lapor' => 'required|date',
        ]);

        $data['status'] = 'dilaporkan';

        return response()->json(MaintenanceRequest::create($data)->load(['asset', 'room']), 201);
    }

    public function update(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $data = $request->validate([
            'status' => 'required|in:dilaporkan,diproses,selesai',
            'tanggal_selesai' => 'nullable|date',
            'catatan_penyelesaian' => 'nullable|string',
        ]);

        $maintenanceRequest->update($data);

        return $maintenanceRequest->fresh(['asset', 'room']);
    }

    public function destroy(MaintenanceRequest $maintenanceRequest)
    {
        $maintenanceRequest->delete();

        return response()->json(['message' => 'Laporan pemeliharaan dihapus.']);
    }
}
