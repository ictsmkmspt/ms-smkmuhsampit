<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicEvent;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class AcademicEventController extends Controller
{
    public function index(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        return AcademicEvent::where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('tanggal_mulai')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'jenis' => 'required|in:semester_ganjil,semester_genap,asts,asas,lainnya',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'keterangan' => 'nullable|string',
        ]);

        $data['tahun_ajaran_id'] = TahunAjaran::aktifId();

        return response()->json(AcademicEvent::create($data), 201);
    }

    public function update(Request $request, AcademicEvent $academicEvent)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'jenis' => 'required|in:semester_ganjil,semester_genap,asts,asas,lainnya',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'keterangan' => 'nullable|string',
        ]);

        $academicEvent->update($data);

        return $academicEvent->fresh();
    }

    public function destroy(AcademicEvent $academicEvent)
    {
        $academicEvent->delete();

        return response()->json(['message' => 'Agenda kalender akademik dihapus.']);
    }
}
