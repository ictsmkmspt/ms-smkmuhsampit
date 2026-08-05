<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\Period;
use App\Models\Schedule;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    /**
     * Data mentah untuk merender grid jadwal 1 tahun ajaran — periods
     * (struktur baris per hari) + schedules (isian per kelas) dikirim
     * terpisah, disatukan di frontend (dan dipakai ulang oleh export Word)
     * supaya tidak perlu 2 bentuk response berbeda untuk kebutuhan yang sama.
     */
    public function grid(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $periods = Period::where('tahun_ajaran_id', $tahunAjaranId)
            ->orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
            ->orderBy('waktu_mulai')
            ->get();

        $schedules = Schedule::with(['subject', 'teacher.user'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->get();

        $classes = ClassRoom::where('status', 'aktif')->orderBy('name')->get();

        return response()->json(['classes' => $classes, 'periods' => $periods, 'schedules' => $schedules]);
    }

    private function rules(): array
    {
        return [
            'period_id' => 'required|exists:periods,id',
            'class_room_id' => 'required|exists:class_rooms,id',
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'nullable|exists:teachers,id',
            'kode' => 'nullable|string|max:10',
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $period = Period::findOrFail($data['period_id']);
        if ($period->tipe !== 'pelajaran') {
            return response()->json(['message' => 'Baris ini bertipe kegiatan khusus, tidak bisa diisi mata pelajaran per kelas.'], 422);
        }

        if (Schedule::where('period_id', $data['period_id'])->where('class_room_id', $data['class_room_id'])->exists()) {
            return response()->json(['message' => 'Kelas ini sudah punya jadwal di jam tersebut.'], 422);
        }

        $data['tahun_ajaran_id'] = $period->tahun_ajaran_id;

        $schedule = Schedule::create($data);

        return response()->json($schedule->load(['subject', 'teacher.user']), 201);
    }

    public function update(Request $request, Schedule $schedule)
    {
        $data = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'nullable|exists:teachers,id',
            'kode' => 'nullable|string|max:10',
        ]);

        $schedule->update($data);

        return $schedule->fresh(['subject', 'teacher.user']);
    }

    public function destroy(Schedule $schedule)
    {
        $schedule->delete();

        return response()->json(['message' => 'Isian jadwal dihapus.']);
    }
}
