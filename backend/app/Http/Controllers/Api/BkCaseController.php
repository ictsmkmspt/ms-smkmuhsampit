<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BkCase;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class BkCaseController extends Controller
{
    public function index(Request $request)
    {
        $query = BkCase::with(['student.user', 'student.classRoom', 'pencatat'])->orderByDesc('tanggal');

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'tanggal' => 'required|date',
            'kategori' => 'required|in:akademik,perilaku,sosial,keluarga,lainnya',
            'catatan' => 'required|string',
            'tindak_lanjut' => 'nullable|string',
        ]);

        $data['dicatat_oleh'] = $request->user()->id;
        $data['tahun_ajaran_id'] = TahunAjaran::aktifId();
        $data['status'] = 'berjalan';

        $case = BkCase::create($data);

        return response()->json($case->load(['student.user', 'student.classRoom', 'pencatat']), 201);
    }

    public function update(Request $request, BkCase $bkCase)
    {
        $data = $request->validate([
            'kategori' => 'sometimes|in:akademik,perilaku,sosial,keluarga,lainnya',
            'catatan' => 'sometimes|string',
            'tindak_lanjut' => 'nullable|string',
            'status' => 'sometimes|in:berjalan,selesai',
        ]);

        $bkCase->update($data);

        return $bkCase->fresh(['student.user', 'student.classRoom', 'pencatat']);
    }

    public function destroy(BkCase $bkCase)
    {
        $bkCase->delete();

        return response()->json(['message' => 'Catatan BK dihapus.']);
    }
}
