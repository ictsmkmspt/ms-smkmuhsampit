<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklMonitoringJadwal;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

/**
 * Jadwal Monitoring PKL — GLOBAL, dikelola admin/waka_kurikulum, dilihat
 * semua guru (read-only bagi guru). Bukan per siswa/per IDUKA/per guru
 * seperti rancangan awal.
 */
class PklMonitoringJadwalController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajarans,id',
        ]);

        $tahunAjaranId = $data['tahun_ajaran_id'] ?? TahunAjaran::aktifId();

        return PklMonitoringJadwal::with('dibuatOleh')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('tanggal_rencana')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'tanggal_rencana' => 'required|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_rencana',
            'catatan' => 'nullable|string|max:500',
        ]);

        $data['dibuat_oleh'] = $request->user()->id;

        $jadwal = PklMonitoringJadwal::create($data);

        return response()->json($jadwal->fresh('dibuatOleh'), 201);
    }

    public function update(Request $request, PklMonitoringJadwal $pklMonitoringJadwal)
    {
        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'tanggal_rencana' => 'required|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_rencana',
            'catatan' => 'nullable|string|max:500',
        ]);

        $pklMonitoringJadwal->update($data);

        return $pklMonitoringJadwal->fresh('dibuatOleh');
    }

    public function destroy(PklMonitoringJadwal $pklMonitoringJadwal)
    {
        $pklMonitoringJadwal->delete();

        return response()->json(['message' => 'Jadwal monitoring dihapus.']);
    }
}
