<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RestrictsToOwnRoom;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\MaintenanceRequest;
use App\Models\User;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;

class MaintenanceRequestController extends Controller
{
    use RestrictsToOwnRoom;

    public function index(Request $request)
    {
        $query = MaintenanceRequest::with(['asset', 'room'])->orderByDesc('tanggal_lapor');

        $roomId = $this->ownRoomId($request);
        if ($roomId !== null) {
            $query->where('room_id', $roomId);
        }
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

        $roomId = $this->ownRoomId($request);
        if ($roomId !== null) {
            if (!empty($data['asset_id']) && Asset::find($data['asset_id'])?->room_id !== $roomId) {
                abort(403, 'Aset ini bukan tanggung jawab ruang Anda.');
            }
            $data['room_id'] = $roomId;
        } elseif (!empty($data['asset_id'])) {
            // Ruang laporan selalu ikut ruang asetnya kalau aset dipilih —
            // penting buat Teknisi (tidak terikat ruang) supaya laporannya
            // tetap tercatat di ruang yang benar.
            $data['room_id'] = Asset::find($data['asset_id'])?->room_id;
        }

        $data['status'] = 'dilaporkan';

        return response()->json(MaintenanceRequest::create($data)->load(['asset', 'room']), 201);
    }

    public function update(Request $request, MaintenanceRequest $maintenanceRequest)
    {
        $roomId = $this->ownRoomId($request);
        if ($roomId !== null && $maintenanceRequest->room_id !== $roomId) {
            abort(403, 'Laporan ini bukan tanggung jawab ruang Anda.');
        }

        $data = $request->validate([
            'status' => 'required|in:dilaporkan,diproses,selesai',
            'tanggal_selesai' => 'nullable|date',
            'catatan_penyelesaian' => 'nullable|string',
        ]);

        $statusBerubah = $data['status'] !== $maintenanceRequest->status;

        $maintenanceRequest->update($data);
        $maintenanceRequest = $maintenanceRequest->fresh(['asset', 'room']);

        if ($statusBerubah && in_array($data['status'], ['diproses', 'selesai']) && $maintenanceRequest->room_id) {
            $penanggungJawab = User::where('role', 'kepala_bengkel')->where('room_id', $maintenanceRequest->room_id)->get();
            $label = $data['status'] === 'diproses' ? 'sedang diproses' : 'selesai';
            NotificationDispatcher::sendMany($penanggungJawab, 'maintenance', 'Status pemeliharaan diperbarui', "Laporan \"{$maintenanceRequest->deskripsi}\" di ruang {$maintenanceRequest->room?->nama} {$label}.", '/staf-ruang');
        }

        return $maintenanceRequest;
    }

    public function destroy(MaintenanceRequest $maintenanceRequest)
    {
        $maintenanceRequest->delete();

        return response()->json(['message' => 'Laporan pemeliharaan dihapus.']);
    }
}
