<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\LooksUpSiswaGuru;
use App\Http\Controllers\Controller;
use App\Models\PerpustakaanKunjungan;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;

/**
 * Kunjungan Perpustakaan — dicatat pengurus (pustakawan), berdiri sendiri
 * dari sirkulasi buku (kunjungan bukan cuma soal pinjam buku, tapi juga
 * baca/tugas/internet/dll). Murni catatan internal pengurus — siswa/guru
 * TIDAK melihat riwayat kunjungannya sendiri di sini.
 */
class PerpustakaanKunjunganController extends Controller
{
    use LooksUpSiswaGuru;

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

        $kunjungan = PerpustakaanKunjungan::create([
            'pengunjung_type' => $data['pengunjung_type'],
            'pengunjung_id' => $data['pengunjung_id'],
            'keperluan' => $data['keperluan'],
            'tanggal' => now()->toDateString(),
            'dicatat_oleh' => $request->user()->id,
        ]);

        return response()->json($kunjungan->load('pengunjung.user'), 201);
    }

    public function riwayatHariIni()
    {
        return PerpustakaanKunjungan::with('pengunjung.user')
            ->where('tanggal', now()->toDateString())
            ->orderByDesc('created_at')
            ->get();
    }
}
