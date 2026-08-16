<?php

namespace App\Http\Controllers\Api;

use App\Exports\RiwayatPeminjamanExport;
use App\Http\Controllers\Controller;
use App\Models\PerpustakaanPeminjaman;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class PerpustakaanPeminjamanController extends Controller
{
    public function aktif()
    {
        return PerpustakaanPeminjaman::with(['eksemplar.buku', 'peminjam.user'])
            ->where('status', 'dipinjam')
            ->orderBy('tanggal_jatuh_tempo')
            ->get();
    }

    public function terlambat()
    {
        return PerpustakaanPeminjaman::with(['eksemplar.buku', 'peminjam.user'])
            ->where('status', 'dipinjam')
            ->whereDate('tanggal_jatuh_tempo', '<', now()->toDateString())
            ->orderBy('tanggal_jatuh_tempo')
            ->get();
    }

    public function riwayat()
    {
        return PerpustakaanPeminjaman::with(['eksemplar.buku', 'peminjam.user'])
            ->whereIn('status', ['dikembalikan', 'rusak', 'hilang'])
            ->orderByDesc('tanggal_kembali')
            ->limit(200)
            ->get();
    }

    /**
     * Rekap lengkap 1 peminjam tertentu (siswa ATAU guru) — dipakai
     * pengurus lewat kotak "Cari Rekap per Peminjam" di Beranda (beda dari
     * rekap ringkas yang otomatis muncul di layar Sirkulasi saat scan, ini
     * balikin daftar LENGKAPnya, bukan cuma angka).
     */
    public function perPeminjam(string $tipe, int $id)
    {
        $modelClass = match ($tipe) {
            'siswa' => Student::class,
            'guru' => Teacher::class,
            default => null,
        };
        if (!$modelClass) {
            return response()->json(['message' => 'Tipe peminjam tidak dikenali.'], 404);
        }

        $peminjam = $modelClass::with('user')->find($id);
        if ($tipe === 'siswa') {
            $peminjam?->load('classRoom');
        }
        if (!$peminjam) {
            return response()->json(['message' => 'Data tidak ditemukan.'], 404);
        }

        $semua = $peminjam->peminjamanPerpustakaan()->with('eksemplar.buku')->orderByDesc('tanggal_pinjam')->get();

        return response()->json([
            'tipe' => $tipe,
            'peminjam' => $peminjam,
            'peminjaman' => $semua,
        ]);
    }

    public function exportRiwayat(Request $request)
    {
        $data = $request->validate([
            'start' => 'nullable|date',
            'end' => 'nullable|date|after_or_equal:start',
        ]);

        $namaFile = isset($data['start'], $data['end'])
            ? "laporan-riwayat-peminjaman-{$data['start']}-sd-{$data['end']}.xlsx"
            : 'laporan-riwayat-peminjaman.xlsx';

        return Excel::download(new RiwayatPeminjamanExport($data['start'] ?? null, $data['end'] ?? null), $namaFile);
    }

    public function punyaSaya(Request $request)
    {
        $peminjam = $request->user()->student ?? $request->user()->teacher;
        if (!$peminjam) {
            return response()->json([]);
        }

        return $peminjam->peminjamanPerpustakaan()->with('eksemplar.buku')->orderByDesc('tanggal_pinjam')->get();
    }
}
