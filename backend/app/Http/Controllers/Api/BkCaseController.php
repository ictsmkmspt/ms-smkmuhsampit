<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RestrictsGuruToOwnClass;
use App\Http\Controllers\Controller;
use App\Models\BkCase;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class BkCaseController extends Controller
{
    use RestrictsGuruToOwnClass;

    /**
     * Guru (wali kelas) dipaksa hanya lihat kelas walinya sendiri (lihat
     * RestrictsGuruToOwnClass) — dipakai menu Laporan > BK guru.
     */
    public function index(Request $request)
    {
        $query = BkCase::with(['student.user', 'student.classRoom', 'pencatat', 'sanksiKejadian.sanksiRule'])->orderByDesc('tanggal');

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $query->where('tahun_ajaran_id', $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId());

        $restricted = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;
        if ($classRoomId) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'sanksi_kejadian_id' => 'nullable|exists:sanksi_kejadian,id',
            'tanggal' => 'required|date',
            'kategori' => 'required|in:akademik,perilaku,sosial,keluarga,lainnya',
            'catatan' => 'required|string',
            'tindak_lanjut' => 'nullable|string',
        ]);

        $data['dicatat_oleh'] = $request->user()->id;
        $data['tahun_ajaran_id'] = TahunAjaran::aktifId();
        $data['status'] = 'berjalan';

        $case = BkCase::create($data);

        return response()->json($case->load(['student.user', 'student.classRoom', 'pencatat', 'sanksiKejadian.sanksiRule']), 201);
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
