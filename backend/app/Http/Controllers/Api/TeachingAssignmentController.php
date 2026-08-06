<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeachingAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $query = TeachingAssignment::with(['teacher.user', 'subject', 'classRoom'])
            ->withCount('schedules')
            ->where('tahun_ajaran_id', $tahunAjaranId);

        if ($request->filled('class_room_id')) {
            $query->where('class_room_id', $request->class_room_id);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            // Boleh lebih dari 1 guru untuk mapel+kelas yang sama (team
            // teaching / mapel dibagi 2 guru) — yang dicegah cuma penugasan
            // GURU YANG SAMA dobel persis untuk mapel+kelas+tahun ajaran ini.
            'subject_id' => [
                'required', 'exists:subjects,id',
                Rule::unique('teaching_assignments')->where(fn ($q) => $q
                    ->where('teacher_id', $request->teacher_id)
                    ->where('class_room_id', $request->class_room_id)
                    ->where('tahun_ajaran_id', $tahunAjaranId)),
            ],
            'class_room_id' => 'required|exists:class_rooms,id',
            // Opsional — sebagian mapel SMK (kejuruan/blok) tidak selalu
            // dipatok rata per minggu, jadi tidak boleh dipaksa wajib.
            'target_jam' => 'nullable|integer|min:1',
        ], [
            'subject_id.unique' => 'Guru ini sudah punya penugasan untuk mata pelajaran & kelas ini di tahun ajaran aktif.',
        ]);

        $data['tahun_ajaran_id'] = $tahunAjaranId;

        $assignment = TeachingAssignment::create($data);

        return response()->json($assignment->load(['teacher.user', 'subject', 'classRoom'])->loadCount('schedules'), 201);
    }

    public function update(Request $request, TeachingAssignment $teachingAssignment)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'target_jam' => 'nullable|integer|min:1',
        ]);

        $teachingAssignment->update($data);

        return $teachingAssignment->fresh(['teacher.user', 'subject', 'classRoom'])->loadCount('schedules');
    }

    public function destroy(TeachingAssignment $teachingAssignment)
    {
        $teachingAssignment->delete();

        return response()->json(['message' => 'Pembagian tugas mengajar dihapus.']);
    }

    /**
     * Generate ulang Kode Guru untuk semua penugasan di tahun ajaran aktif —
     * urutan hurufnya (A, B, C, ... Z, AA, AB, dst) mengikuti urutan baris
     * di tabel Daftar Penugasan (yang diurutkan kode mata pelajaran), BUKAN
     * urutan nama guru: guru yang penugasannya tampil duluan di tabel dapat
     * huruf duluan. Kalau guru itu punya lebih dari 1 penugasan, tiap
     * penugasannya dibedakan dengan angka di belakang huruf sesuai urutan
     * kemunculannya di tabel juga (A1, A2, dst) — kalau cuma 1 penugasan,
     * hurufnya saja tanpa angka. Kode ini langsung disalin ke Schedule.kode
     * supaya jadwal yang sudah ditempatkan ikut ter-update.
     */
    public function generateKodeGuru(Request $request)
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $assignments = TeachingAssignment::with(['teacher.user', 'subject'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->get()
            ->sortBy(fn ($a) => $a->subject?->kode ?? '')
            ->values();

        $jumlahPerGuru = $assignments->countBy('teacher_id');
        $hurufPerGuru = [];
        $urutanPerGuru = [];
        $nextIndex = 0;

        foreach ($assignments as $assignment) {
            $teacherId = $assignment->teacher_id;
            if (!isset($hurufPerGuru[$teacherId])) {
                $hurufPerGuru[$teacherId] = $this->hurufUntukIndex($nextIndex);
                $urutanPerGuru[$teacherId] = 0;
                $nextIndex++;
            }

            $urutanPerGuru[$teacherId]++;
            $jumlah = $jumlahPerGuru[$teacherId];
            $kode = $jumlah > 1 ? $hurufPerGuru[$teacherId] . $urutanPerGuru[$teacherId] : $hurufPerGuru[$teacherId];

            $assignment->update(['kode_guru' => $kode]);
            Schedule::where('teaching_assignment_id', $assignment->id)->update(['kode' => $kode]);
        }

        return TeachingAssignment::with(['teacher.user', 'subject', 'classRoom'])
            ->withCount('schedules')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->get();
    }

    private function hurufUntukIndex(int $index): string
    {
        $huruf = '';
        $index++;
        while ($index > 0) {
            $index--;
            $huruf = chr(65 + ($index % 26)) . $huruf;
            $index = intdiv($index, 26);
        }
        return $huruf;
    }
}
