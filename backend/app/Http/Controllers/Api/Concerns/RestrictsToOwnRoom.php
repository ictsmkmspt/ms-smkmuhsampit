<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\Request;

trait RestrictsToOwnRoom
{
    /**
     * Kalau user yang login adalah kepala_bengkel, kembalikan ID ruang yang
     * jadi tanggung jawabnya (atau -1 kalau belum ditugaskan ke ruang
     * manapun, supaya query jadi "tidak ada hasil" bukan malah bocor lihat
     * semua ruang). Teknisi SENGAJA tidak dibatasi ke 1 ruang — bisa bantu
     * inventaris di ruang manapun. Role lain (admin/waka_sarpras) juga tidak
     * dibatasi. null artinya "tidak ada pembatasan".
     */
    private function ownRoomId(Request $request): ?int
    {
        if ($request->user()->role !== 'kepala_bengkel') {
            return null;
        }

        return $request->user()->room_id ?? -1;
    }
}
