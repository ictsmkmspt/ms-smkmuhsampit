<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\Schedule;
use App\Models\Subject;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeachingAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $query = TeachingAssignment::with(['teacher.user', 'subject', 'classRoom'])
            ->withCount('schedules')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('urutan');

        if ($request->filled('class_room_id')) {
            $query->where('class_room_id', $request->class_room_id);
        }
        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
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
        // Penugasan baru ditaruh paling akhir tabel, bukan ikut nyempil ke
        // posisi 0 (yang akan mendorong semua baris lain kalau dibiarkan default null/0).
        $data['urutan'] = (TeachingAssignment::where('tahun_ajaran_id', $tahunAjaranId)->max('urutan') ?? -1) + 1;

        $assignment = TeachingAssignment::create($data);

        return response()->json($assignment->load(['teacher.user', 'subject', 'classRoom'])->loadCount('schedules'), 201);
    }

    /**
     * Buat penugasan 1 guru + 1 mapel ke BANYAK kelas sekaligus — dipakai
     * roster "Tambah Penugasan" di layar admin: pilih guru & mapel sekali,
     * centang kelas mana saja yang mau ditugaskan, submit sekali jadi
     * banyak penugasan sekaligus (pola sama seperti
     * PklPlacementController::storeBulk()).
     *
     * Kelas yang SUDAH punya penugasan DILEWATI (bukan menggagalkan
     * seluruh batch) — tapi definisi "sudah ada" beda per tipe mapel:
     * - Mapel "umum": dicek per mapel+kelas+tahun ajaran SAJA (lepas dari
     *   guru) — 1 kelas cuma 1 guru untuk mapel umum yang sama, supaya
     *   tidak dobel tanpa sengaja.
     * - Mapel "kejuruan": dicek per GURU+mapel+kelas+tahun ajaran — guru
     *   lain BOLEH ditugaskan ke kelas+mapel yang sama (team
     *   teaching/mapel produktif memang lazim diampu >1 guru sekaligus),
     *   yang dicegah cuma guru yang SAMA dobel persis. Constraint unik di
     *   level database sendiri sudah `(teacher_id, subject_id,
     *   class_room_id, tahun_ajaran_id)` sejak migrasi
     *   allow_multiple_teachers_per_subject_class — jadi kejuruan di sini
     *   cuma menyamakan aturan APLIKASI dengan yang sudah diizinkan DB.
     */
    public function storeBulk(Request $request)
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'subject_id' => 'required|exists:subjects,id',
            'class_room_ids' => 'required|array|min:1',
            'class_room_ids.*' => 'exists:class_rooms,id',
            'target_jam' => 'nullable|integer|min:1',
        ]);

        $subject = Subject::findOrFail($data['subject_id']);

        [$classIdsBaru, $classIdsSudahAda] = DB::transaction(function () use ($data, $tahunAjaranId, $subject) {
            $classIdsSudahAda = TeachingAssignment::where('subject_id', $data['subject_id'])
                ->where('tahun_ajaran_id', $tahunAjaranId)
                ->whereIn('class_room_id', $data['class_room_ids'])
                ->when($subject->tipe === 'kejuruan', fn ($q) => $q->where('teacher_id', $data['teacher_id']))
                ->pluck('class_room_id');

            $classIdsBaru = collect($data['class_room_ids'])->diff($classIdsSudahAda)->values();

            $urutan = (TeachingAssignment::where('tahun_ajaran_id', $tahunAjaranId)->max('urutan') ?? -1) + 1;
            foreach ($classIdsBaru as $classRoomId) {
                TeachingAssignment::create([
                    'teacher_id' => $data['teacher_id'],
                    'subject_id' => $data['subject_id'],
                    'class_room_id' => $classRoomId,
                    'tahun_ajaran_id' => $tahunAjaranId,
                    'target_jam' => $data['target_jam'] ?? null,
                    'urutan' => $urutan++,
                ]);
            }

            return [$classIdsBaru, $classIdsSudahAda];
        });

        $namaDilewati = $classIdsSudahAda->isEmpty() ? [] : ClassRoom::whereIn('id', $classIdsSudahAda)
            ->pluck('name')
            ->values();

        $dibuat = $classIdsBaru->count();
        $dilewati = count($namaDilewati);

        return response()->json([
            'message' => "{$dibuat} penugasan berhasil dibuat" . ($dilewati ? ", {$dilewati} kelas dilewati (sudah punya penugasan untuk mata pelajaran ini)." : '.'),
            'dibuat' => $dibuat,
            'dilewati' => $namaDilewati,
        ], 201);
    }

    public function update(Request $request, TeachingAssignment $teachingAssignment)
    {
        if ($teachingAssignment->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Penugasan ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'target_jam' => 'nullable|integer|min:1',
            // Biasanya dibuat lewat tombol "Generate Kode Guru A-Z", tapi boleh
            // ditimpa manual per baris juga — sengaja TIDAK divalidasi unik,
            // karena kode yang sama boleh dipakai lebih dari 1 penugasan
            // (mis. team teaching / guru yang sama tapi baris terpisah).
            'kode_guru' => 'nullable|string|max:10',
        ]);

        $teachingAssignment->update($data);

        // Samakan dengan Schedule.kode yang sudah ditempatkan dari penugasan
        // ini — sama seperti yang dilakukan generateKodeGuru(), supaya Jadwal
        // Pelajaran tidak diam-diam beda dari kode yang baru diubah di sini.
        if (array_key_exists('kode_guru', $data)) {
            Schedule::where('teaching_assignment_id', $teachingAssignment->id)->update(['kode' => $data['kode_guru']]);
        }

        return $teachingAssignment->fresh(['teacher.user', 'subject', 'classRoom'])->loadCount('schedules');
    }

    public function destroy(TeachingAssignment $teachingAssignment)
    {
        if ($teachingAssignment->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Penugasan ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus.'], 422);
        }

        $teachingAssignment->delete();

        return response()->json(['message' => 'Pembagian tugas mengajar dihapus.']);
    }

    /**
     * Simpan urutan baru hasil drag-and-drop di tabel Daftar Penugasan.
     * "ids" wajib berisi SELURUH id penugasan tahun ajaran aktif (bukan
     * sebagian) — urutan array itu langsung jadi nilai `urutan` (0, 1, 2, ...).
     */
    public function reorder(Request $request)
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $data = $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:teaching_assignments,id',
        ]);

        $milikTahunIni = TeachingAssignment::where('tahun_ajaran_id', $tahunAjaranId)
            ->whereIn('id', $data['ids'])
            ->count();

        if ($milikTahunIni !== count($data['ids'])) {
            return response()->json(['message' => 'Sebagian penugasan bukan milik tahun ajaran aktif.'], 422);
        }

        foreach ($data['ids'] as $index => $id) {
            TeachingAssignment::where('id', $id)->update(['urutan' => $index]);
        }

        return TeachingAssignment::with(['teacher.user', 'subject', 'classRoom'])
            ->withCount('schedules')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('urutan')
            ->get();
    }

    /**
     * Generate ulang Kode Guru untuk semua penugasan di tahun ajaran aktif —
     * urutan hurufnya (A, B, C, ... Z, AA, AB, dst) mengikuti urutan baris
     * di tabel Daftar Penugasan (kolom `urutan`, bisa diatur manual lewat
     * drag-and-drop), BUKAN urutan nama guru: guru yang penugasannya tampil
     * duluan di tabel dapat huruf duluan. Kalau guru itu punya lebih dari 1
     * penugasan, tiap penugasannya dibedakan dengan angka di belakang huruf
     * sesuai urutan kemunculannya di tabel juga (A1, A2, dst) — kalau cuma 1
     * penugasan, hurufnya saja tanpa angka. Kode ini langsung disalin ke
     * Schedule.kode supaya jadwal yang sudah ditempatkan ikut ter-update.
     */
    public function generateKodeGuru(Request $request)
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $assignments = TeachingAssignment::with(['teacher.user', 'subject'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('urutan')
            ->get();

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
            ->orderBy('urutan')
            ->get();
    }

    /**
     * Daftar penugasan mengajar milik guru yang sedang login — dipakai
     * frontend buat membatasi pilihan mapel & kelas di menu Nilai supaya
     * cuma yang benar-benar diampu guru itu di tahun ajaran aktif, bukan
     * semua mapel & kelas se-sekolah.
     */
    public function myAssignments(Request $request)
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return response()->json([]);
        }

        return TeachingAssignment::with(['subject', 'classRoom'])
            ->where('teacher_id', $teacher->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
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
