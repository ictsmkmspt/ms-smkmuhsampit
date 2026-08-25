<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PpdbPeriode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Periode/gelombang penerimaan PPDB — SENGAJA terpisah dari
 * TahunAjaranController (tahun ajaran sekolah), karena masa pendaftaran
 * siswa baru sering tidak beriringan dengan tahun ajaran. Pola CRUD +
 * aktifkan()/destroy() sengaja meniru TahunAjaranController supaya
 * perilakunya familiar bagi admin yang sudah paham menu Tahun Ajaran.
 */
class PpdbPeriodeController extends Controller
{
    public function index()
    {
        return PpdbPeriode::withCount('pendaftars')->orderByDesc('created_at')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
            'biaya_nominal_l' => 'nullable|integer|min:0',
            'biaya_nominal_p' => 'nullable|integer|min:0',
        ]);

        $periode = PpdbPeriode::create([
            'nama' => $data['nama'],
            'status' => 'nonaktif',
            'tanggal_mulai' => $data['tanggal_mulai'] ?? null,
            'tanggal_selesai' => $data['tanggal_selesai'] ?? null,
            'biaya_nominal_l' => $data['biaya_nominal_l'] ?? 0,
            'biaya_nominal_p' => $data['biaya_nominal_p'] ?? 0,
        ]);

        return response()->json($periode, 201);
    }

    /**
     * Nama & status SENGAJA tidak bisa diubah lewat sini — nama supaya
     * histori pendaftar yang sudah tercatat di periode ini tidak "berubah
     * label" diam-diam, status lewat aktifkan() supaya cuma 1 periode yang
     * aktif dalam 1 waktu. Tanggal & nominal biaya boleh dikoreksi kapan
     * saja (mis. biaya berubah di tengah gelombang berjalan).
     */
    public function update(Request $request, PpdbPeriode $ppdbPeriode)
    {
        $data = $request->validate([
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
            'biaya_nominal_l' => 'nullable|integer|min:0',
            'biaya_nominal_p' => 'nullable|integer|min:0',
        ]);

        $ppdbPeriode->update([
            'tanggal_mulai' => $data['tanggal_mulai'] ?? null,
            'tanggal_selesai' => $data['tanggal_selesai'] ?? null,
            'biaya_nominal_l' => $data['biaya_nominal_l'] ?? 0,
            'biaya_nominal_p' => $data['biaya_nominal_p'] ?? 0,
        ]);

        return $ppdbPeriode->fresh();
    }

    /**
     * Aktifkan 1 periode PPDB (menonaktifkan yang lain) — dari sini,
     * pendaftar baru (online maupun offline) otomatis masuk periode ini
     * (lihat PpdbPendaftar::booted()). Periode lain & riwayat pendaftarnya
     * tidak diubah/dihapus sama sekali.
     */
    public function aktifkan(PpdbPeriode $ppdbPeriode)
    {
        DB::transaction(function () use ($ppdbPeriode) {
            PpdbPeriode::lockForUpdate()->get();

            PpdbPeriode::where('id', '!=', $ppdbPeriode->id)->update(['status' => 'nonaktif']);
            $ppdbPeriode->update(['status' => 'aktif']);
        });

        return response()->json(['message' => "Periode PPDB \"{$ppdbPeriode->nama}\" sekarang aktif."]);
    }

    /**
     * Periode aktif atau yang masih punya pendaftar tercatat tidak boleh
     * dihapus — hapus cuma buat periode kosong (mis. salah ketik saat
     * dibuat), sama seperti aturan TahunAjaranController::destroy().
     */
    public function destroy(PpdbPeriode $ppdbPeriode)
    {
        if ($ppdbPeriode->status === 'aktif') {
            return response()->json(['message' => 'Tidak bisa menghapus periode PPDB yang sedang aktif.'], 422);
        }

        if ($ppdbPeriode->pendaftars()->exists()) {
            return response()->json(['message' => 'Periode ini masih punya data pendaftar, tidak bisa dihapus.'], 422);
        }

        $ppdbPeriode->delete();

        return response()->json(['message' => 'Periode PPDB dihapus.']);
    }
}
