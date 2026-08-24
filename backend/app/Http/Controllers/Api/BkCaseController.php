<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RestrictsGuruToOwnClass;
use App\Http\Controllers\Controller;
use App\Models\BkCase;
use App\Models\TahunAjaran;
use App\Services\NotificationDispatcher;
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

        $case = BkCase::create($data)->load(['student.user', 'student.parents', 'student.classRoom', 'pencatat', 'sanksiKejadian.sanksiRule']);

        if ($case->student->user) {
            NotificationDispatcher::send($case->student->user, 'bk', 'Kasus BK baru dicatat', 'Ada catatan BK baru untukmu, temui guru BK untuk tindak lanjut.', '/siswa');
            NotificationDispatcher::sendMany($case->student->parents, 'bk', 'Kasus BK anak Anda', "Ada catatan BK baru untuk {$case->student->user->name}.", '/wali');
        }

        return response()->json($case, 201);
    }

    public function update(Request $request, BkCase $bkCase)
    {
        $data = $request->validate([
            'kategori' => 'sometimes|in:akademik,perilaku,sosial,keluarga,lainnya',
            'catatan' => 'sometimes|string',
            'tindak_lanjut' => 'nullable|string',
            'status' => 'sometimes|in:berjalan,selesai',
        ]);

        $statusSelesai = ($data['status'] ?? null) === 'selesai' && $bkCase->status !== 'selesai';

        $bkCase->update($data);
        $bkCase = $bkCase->fresh(['student.user', 'student.parents', 'student.classRoom', 'pencatat']);

        if ($statusSelesai && $bkCase->student->user) {
            NotificationDispatcher::send($bkCase->student->user, 'bk', 'Kasus BK selesai', 'Catatan BK-mu sudah ditandai selesai.', '/siswa');
            NotificationDispatcher::sendMany($bkCase->student->parents, 'bk', 'Kasus BK anak Anda selesai', "Catatan BK {$bkCase->student->user->name} sudah ditandai selesai.", '/wali');
        }

        return $bkCase;
    }

    public function destroy(BkCase $bkCase)
    {
        $bkCase->delete();

        return response()->json(['message' => 'Catatan BK dihapus.']);
    }
}
