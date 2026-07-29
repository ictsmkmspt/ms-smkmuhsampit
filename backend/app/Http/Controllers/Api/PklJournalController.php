<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklJournal;
use App\Models\PklPlacement;
use Illuminate\Http\Request;

class PklJournalController extends Controller
{
    /**
     * True kalau user yang login berwenang melihat jurnal kegiatan penempatan ini —
     * admin, guru pembimbingnya, atau DUDI pemiliknya.
     */
    private function bolehLihat(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ($user->role === 'guru') {
            $teacher = $user->teacher;
            return $teacher && $placement->guru_pembimbing_id === $teacher->id;
        }
        if ($user->role === 'dudi') {
            $dudi = $user->dudi;
            return $dudi && $placement->dudi_id === $dudi->id;
        }
        return false;
    }

    /**
     * True kalau user yang login berwenang mengisi kolom "Catatan" — sesuai format
     * jurnal kertas, kolom ini cuma diisi Instruktur Dunia Kerja (DUDI), atau admin.
     */
    private function bolehIsiCatatan(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ($user->role === 'dudi') {
            $dudi = $user->dudi;
            return $dudi && $placement->dudi_id === $dudi->id;
        }
        return false;
    }

    private function placementSiswa(Request $request): ?PklPlacement
    {
        $student = $request->user()->student;
        if (!$student) {
            return null;
        }
        return $student->pklPlacementAktif()->first();
    }

    /**
     * Siswa menambah 1 catatan "Kegiatan" baru untuk 1 tanggal (default hari ini).
     * Boleh lebih dari 1 kegiatan dalam tanggal yang sama (misal beda jam/tugas).
     * Kolom "Catatan" tidak bisa diisi lewat sini — itu wewenang DUDI.
     */
    public function simpanKegiatan(Request $request)
    {
        $data = $request->validate([
            'date'     => 'nullable|date',
            'kegiatan' => 'required|string|max:2000',
        ]);

        $placement = $this->placementSiswa($request);
        if (!$placement) {
            return response()->json(['message' => 'Anda tidak sedang dalam masa PKL.'], 422);
        }

        $jurnal = PklJournal::create([
            'pkl_placement_id' => $placement->id,
            'student_id'       => $placement->student_id,
            'date'             => $data['date'] ?? now()->format('Y-m-d'),
            'kegiatan'         => $data['kegiatan'],
        ]);

        return response()->json([
            'message' => 'Kegiatan berhasil ditambahkan.',
            'jurnal'  => $jurnal,
        ], 201);
    }

    /**
     * Riwayat jurnal kegiatan siswa yang sedang login.
     */
    public function riwayatSaya(Request $request)
    {
        $placement = $this->placementSiswa($request);
        if (!$placement) {
            return response()->json([]);
        }

        return PklJournal::where('pkl_placement_id', $placement->id)
            ->orderByDesc('date')->get();
    }

    /**
     * Riwayat jurnal kegiatan 1 penempatan tertentu — dipakai guru pembimbing,
     * DUDI, atau admin untuk memantau/mengisi catatan.
     */
    public function riwayatPenempatan(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihat($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang melihat jurnal siswa ini.'], 403);
        }

        return PklJournal::with('catatanBy')
            ->where('pkl_placement_id', $pklPlacement->id)
            ->orderByDesc('date')->get();
    }

    /**
     * DUDI (atau admin) mengisi kolom "Catatan" pada 1 baris jurnal kegiatan.
     */
    public function isiCatatan(Request $request, PklJournal $pklJournal)
    {
        $placement = $pklJournal->placement;
        if (!$this->bolehIsiCatatan($placement, $request->user())) {
            return response()->json(['message' => 'Hanya DUDI atau admin yang bisa mengisi catatan.'], 403);
        }

        $data = $request->validate([
            'catatan' => 'required|string|max:2000',
        ]);

        $pklJournal->catatan    = $data['catatan'];
        $pklJournal->catatan_by = $request->user()->id;
        $pklJournal->catatan_at = now();
        $pklJournal->save();

        return response()->json([
            'message' => 'Catatan berhasil disimpan.',
            'jurnal'  => $pklJournal->fresh('catatanBy'),
        ]);
    }
}
