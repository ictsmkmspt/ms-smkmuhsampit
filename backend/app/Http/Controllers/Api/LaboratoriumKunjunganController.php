<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\LooksUpSiswaGuru;
use App\Http\Controllers\Api\Concerns\RestrictsToOwnRoom;
use App\Http\Controllers\Controller;
use App\Models\LaboratoriumKunjungan;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;

/**
 * Kunjungan Laboratorium — dicatat Kepala Bengkel yang ditugaskan ke ruang
 * berjenis Laboratorium (tidak ada peran baru, tab-nya di frontend cuma
 * dimunculkan kalau ruang akun itu jenisnya 'lab'). Selalu dibatasi ke
 * ruang milik akun yang login, sama seperti Inventaris/Pemeliharaan.
 */
class LaboratoriumKunjunganController extends Controller
{
    use LooksUpSiswaGuru;
    use RestrictsToOwnRoom;

    private function requireOwnRoom(Request $request): int|\Illuminate\Http\JsonResponse
    {
        $roomId = $this->ownRoomId($request);
        if (!$roomId || $roomId === -1) {
            return response()->json(['message' => 'Akun ini belum ditugaskan ke ruang manapun — hubungi Waka Sarpras/Admin.'], 422);
        }

        return $roomId;
    }

    public function cariKode(string $kode)
    {
        $hasil = $this->cariSiswaGuruByKode($kode);
        if (!$hasil) {
            return response()->json(['message' => 'QR Code/NIS/NIP tidak dikenali.'], 404);
        }

        return response()->json($hasil['model']->toArray() + ['tipe' => $hasil['tipe']]);
    }

    public function cariNama(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        return response()->json($this->cariSiswaGuruByNama($q));
    }

    public function store(Request $request)
    {
        $roomId = $this->requireOwnRoom($request);
        if ($roomId instanceof \Illuminate\Http\JsonResponse) {
            return $roomId;
        }

        $data = $request->validate([
            'pengunjung_type' => 'required|in:siswa,guru',
            'pengunjung_id' => 'required|integer',
            'keperluan' => 'required|string|max:100',
        ]);

        if ($data['pengunjung_type'] === 'siswa') {
            $valid = Student::whereKey($data['pengunjung_id'])->where('status', 'aktif')->exists();
        } else {
            $valid = Teacher::whereKey($data['pengunjung_id'])->exists();
        }
        if (!$valid) {
            return response()->json(['message' => 'Pengunjung tidak ditemukan atau sudah tidak aktif.'], 422);
        }

        $kunjungan = LaboratoriumKunjungan::create([
            'room_id' => $roomId,
            'pengunjung_type' => $data['pengunjung_type'],
            'pengunjung_id' => $data['pengunjung_id'],
            'keperluan' => $data['keperluan'],
            'tanggal' => now()->toDateString(),
            'dicatat_oleh' => $request->user()->id,
        ]);

        return response()->json($kunjungan->load('pengunjung.user'), 201);
    }

    public function riwayatHariIni(Request $request)
    {
        $roomId = $this->requireOwnRoom($request);
        if ($roomId instanceof \Illuminate\Http\JsonResponse) {
            return $roomId;
        }

        return LaboratoriumKunjungan::with('pengunjung.user')
            ->where('room_id', $roomId)
            ->where('tanggal', now()->toDateString())
            ->orderByDesc('created_at')
            ->get();
    }
}
