<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\PeriodTemplate;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    /**
     * Data mentah untuk merender grid jadwal — struktur baris jam SELALU
     * ikut Template Jadwal (period_templates, global, tidak per tahun
     * ajaran lagi — tidak perlu dimuat manual) + schedules (isian per kelas
     * tahun ajaran ini) + assignments (daftar Tugas Mengajar berikut jumlah
     * jam yang sudah ditempatkan, dipakai frontend buat panel "pool"
     * penempatan) dikirim terpisah, disatukan di frontend (dan dipakai
     * ulang oleh export Word) supaya tidak perlu beberapa bentuk response
     * berbeda untuk kebutuhan yang sama.
     */
    public function grid(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $periods = PeriodTemplate::orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
            ->orderBy('waktu_mulai')
            ->get();

        $schedules = Schedule::with(['subject', 'teacher.user'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->get();

        $classes = ClassRoom::where('status', 'aktif')->orderBy('name')->get();

        $assignments = TeachingAssignment::with(['teacher.user', 'subject'])
            ->withCount('schedules')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->get();

        return response()->json(['classes' => $classes, 'periods' => $periods, 'schedules' => $schedules, 'assignments' => $assignments]);
    }

    /**
     * Isi 1 sel grid — WAJIB berasal dari Tugas Mengajar yang sudah ada
     * (bukan pilih bebas mapel+guru lagi), supaya isian jadwal tidak pernah
     * menyimpang dari penugasan resminya, dan otomatis kebal dari 2 hal:
     * guru dobel jam di kelas lain (dicek eksplisit di sini), dan mapel/guru
     * yang tidak sesuai penugasan (mustahil terjadi, karena diambil dari
     * assignment itu sendiri, bukan input bebas).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'period_id' => 'required|exists:period_templates,id',
            'teaching_assignment_id' => 'required|exists:teaching_assignments,id',
        ]);

        $period = PeriodTemplate::findOrFail($data['period_id']);
        if ($period->tipe !== 'pelajaran') {
            return response()->json(['message' => 'Baris ini bertipe kegiatan khusus, tidak bisa diisi mata pelajaran per kelas.'], 422);
        }

        $assignment = TeachingAssignment::findOrFail($data['teaching_assignment_id']);

        if ($assignment->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Penugasan ini milik tahun ajaran yang tidak aktif, tidak bisa dipakai menambah isian jadwal baru.'], 422);
        }

        if (Schedule::where('period_id', $data['period_id'])->where('class_room_id', $assignment->class_room_id)->exists()) {
            return response()->json(['message' => 'Kelas ini sudah punya jadwal di jam tersebut.'], 422);
        }

        if ($assignment->teacher_id && Schedule::where('period_id', $data['period_id'])->where('teacher_id', $assignment->teacher_id)->exists()) {
            return response()->json(['message' => 'Guru ini sudah mengajar kelas lain di jam yang sama.'], 422);
        }

        if ($assignment->target_jam !== null) {
            $terpasang = Schedule::where('teaching_assignment_id', $assignment->id)->count();
            if ($terpasang >= $assignment->target_jam) {
                return response()->json(['message' => "Jam untuk penugasan ini sudah penuh ({$assignment->target_jam} jam)."], 422);
            }
        }

        $schedule = Schedule::create([
            'period_id' => $data['period_id'],
            'teaching_assignment_id' => $assignment->id,
            'class_room_id' => $assignment->class_room_id,
            'subject_id' => $assignment->subject_id,
            'teacher_id' => $assignment->teacher_id,
            'tahun_ajaran_id' => $assignment->tahun_ajaran_id,
            // Kode tampilan di jadwal ikut Kode Guru penugasannya (lihat
            // TeachingAssignmentController::generateKodeGuru) — kalau belum
            // pernah di-generate, tetap null dan konsumen (grid/export)
            // sudah punya fallback ke kode mapel.
            'kode' => $assignment->kode_guru,
        ]);

        return response()->json($schedule->load(['subject', 'teacher.user']), 201);
    }

    /**
     * Cuma boleh pindah jam (drag ke slot lain, dicek ulang bentrok kelas &
     * guru) dan/atau ubah kode tampilan — mapel/guru tidak bisa diubah
     * langsung di sini lagi (unplace + tempatkan ulang dari assignment lain
     * kalau memang perlu ganti mapel/guru).
     */
    public function update(Request $request, Schedule $schedule)
    {
        if ($schedule->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Isian jadwal ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $data = $request->validate([
            'period_id' => 'nullable|exists:period_templates,id',
            'kode' => 'nullable|string|max:10',
        ]);

        if (!empty($data['period_id']) && (int) $data['period_id'] !== $schedule->period_id) {
            $period = PeriodTemplate::findOrFail($data['period_id']);
            if ($period->tipe !== 'pelajaran') {
                return response()->json(['message' => 'Baris ini bertipe kegiatan khusus, tidak bisa diisi mata pelajaran per kelas.'], 422);
            }
            if (Schedule::where('period_id', $data['period_id'])->where('class_room_id', $schedule->class_room_id)->where('id', '!=', $schedule->id)->exists()) {
                return response()->json(['message' => 'Kelas ini sudah punya jadwal di jam tersebut.'], 422);
            }
            if ($schedule->teacher_id && Schedule::where('period_id', $data['period_id'])->where('teacher_id', $schedule->teacher_id)->where('id', '!=', $schedule->id)->exists()) {
                return response()->json(['message' => 'Guru ini sudah mengajar kelas lain di jam yang sama.'], 422);
            }
            $schedule->period_id = $data['period_id'];
        }

        if (array_key_exists('kode', $data)) {
            $schedule->kode = $data['kode'];
        }

        $schedule->save();

        return $schedule->fresh(['subject', 'teacher.user']);
    }

    public function destroy(Schedule $schedule)
    {
        if ($schedule->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Isian jadwal ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus.'], 422);
        }

        $schedule->delete();

        return response()->json(['message' => 'Isian jadwal dihapus.']);
    }

    /**
     * Jadwal 1 kelas saja (siswa/wali) — cuma jam+isian kelas itu, bukan
     * seluruh sekolah kayak grid() punya admin. Kode tetap dikirim sama
     * seperti mapel & nama gurunya, supaya frontend bisa tampilkan kode
     * ringkas di tabel + daftar keterangan (kode -> mapel & guru) di bawahnya.
     */
    private function gridUntukKelas(int $classRoomId)
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $periods = PeriodTemplate::orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
            ->orderBy('waktu_mulai')
            ->get();

        $schedules = Schedule::with(['subject', 'teacher.user', 'period'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->where('class_room_id', $classRoomId)
            ->get();

        return response()->json(['periods' => $periods, 'schedules' => $schedules]);
    }

    public function mySchedule(Request $request)
    {
        $classRoomId = Student::where('user_id', $request->user()->id)->value('class_room_id');

        if (!$classRoomId) {
            return response()->json(['message' => 'Anda belum terdaftar di kelas manapun.'], 422);
        }

        return $this->gridUntukKelas($classRoomId);
    }

    public function childSchedule(Request $request, $studentId)
    {
        $isMyChild = $request->user()->children()->where('students.id', $studentId)->exists();
        if (!$isMyChild) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
        }

        $classRoomId = Student::where('id', $studentId)->value('class_room_id');
        if (!$classRoomId) {
            return response()->json(['message' => 'Siswa ini belum terdaftar di kelas manapun.'], 422);
        }

        return $this->gridUntukKelas($classRoomId);
    }
}
