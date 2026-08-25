<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TracerStudy;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Isian tracer study alumni sendiri (bagian fitur BKK) — dipakai halaman
 * "Loker" siswa (cuma alumni, lihat gating di LokerTab.jsx). BKK melihat
 * rekap semua alumni lewat BkkController::tracerRecap().
 */
class TracerStudyController extends Controller
{
    private function alumniAtauTolak(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student && $student->status === 'lulus', 403, 'Fitur ini khusus alumni.');
        return $student;
    }

    public function myTracerStudy(Request $request)
    {
        $student = $this->alumniAtauTolak($request);
        return $student->tracerStudy;
    }

    /**
     * Simpan/perbarui isian sendiri — updateOrCreate supaya alumni bisa
     * mengisi ulang kapan saja statusnya berubah (mis. dari "mencari
     * kerja" jadi "bekerja"), bukan cuma sekali seumur hidup.
     */
    public function submit(Request $request)
    {
        $student = $this->alumniAtauTolak($request);

        $data = $request->validate([
            'status_saat_ini'    => ['required', Rule::in(['bekerja', 'melanjutkan_kuliah', 'wirausaha', 'mencari_kerja'])],
            'nama_perusahaan'    => 'nullable|string|max:150',
            'masa_tunggu_bulan'  => 'nullable|integer|min:0|max:120',
        ]);

        $tracer = TracerStudy::updateOrCreate(['student_id' => $student->id], $data);

        return response()->json($tracer, 200);
    }
}
