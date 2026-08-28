<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\PeriodTemplate;
use App\Models\Schedule;
use App\Models\Student;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ScheduleController extends Controller
{
    /**
     * Notif "jadwal pelajaran diubah" ke semua siswa aktif kelas terkait +
     * gurunya (kalau ada) — dipanggil dari update()/destroy() begitu 1
     * isian jadwal benar-benar berpindah jam atau dihapus.
     */
    private function notifyJadwalBerubah(Schedule $schedule, string $pesan): void
    {
        $schedule->loadMissing('subject', 'teacher.user');
        $students = Student::with('user')->where('class_room_id', $schedule->class_room_id)->where('status', 'aktif')->get();
        NotificationDispatcher::sendMany($students->pluck('user')->filter(), 'jadwal', 'Jadwal pelajaran diubah', "{$schedule->subject?->nama}: {$pesan}", '/siswa');

        if ($schedule->teacher?->user) {
            NotificationDispatcher::send($schedule->teacher->user, 'jadwal', 'Jadwal mengajar diubah', "{$schedule->subject?->nama}: {$pesan}", '/guru');
        }
    }

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
     * Isi otomatis SISA jam yang belum ditempatkan dari semua Tugas
     * Mengajar tahun ajaran aktif — pengisian greedy per assignment
     * (urutan sesuai `urutan`), cari slot kosong pertama yang tidak
     * bentrok kelas/guru, dan yang tidak membuat total jam guru itu
     * melebihi `max_jam_mengajar`-nya (kalau diisi). Assignment yang
     * kekurangan slot dilaporkan di `gagal` (bukan bikin request gagal
     * total) supaya admin tinggal lengkapi manual sisanya lewat grid,
     * pola sama seperti StudentsImport::failures() — batch besar tidak
     * boleh gagal total gara-gara 1-2 baris bermasalah.
     */
    public function generateOtomatis(Request $request)
    {
        $tahunAjaranId = TahunAjaran::aktifId();
        abort_unless($tahunAjaranId, 422, 'Tidak ada tahun ajaran aktif.');

        $periods = PeriodTemplate::where('tipe', 'pelajaran')
            ->orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
            ->orderBy('waktu_mulai')
            ->get();

        if ($periods->isEmpty()) {
            return response()->json(['message' => 'Belum ada Template Jadwal bertipe "pelajaran" — isi dulu di menu Template Jadwal.'], 422);
        }

        $assignments = TeachingAssignment::with(['teacher.user', 'subject', 'classRoom'])
            ->withCount('schedules')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->whereNotNull('target_jam')
            ->orderBy('urutan')
            ->get()
            ->filter(fn ($a) => $a->schedules_count < $a->target_jam)
            ->values();

        if ($assignments->isEmpty()) {
            return response()->json([
                'ditempatkan' => 0,
                'gagal' => [],
                'message' => 'Tidak ada yang perlu ditempatkan — semua Tugas Mengajar yang punya target jam sudah terisi penuh.',
            ]);
        }

        // Peta slot yang sudah terpakai + akumulasi jam per guru, dimulai
        // dari isian yang SUDAH ada (bukan cuma yang baru ditempatkan di
        // sini) — supaya batas max_jam_mengajar dihitung dari jam mengajar
        // guru itu SELURUHNYA di tahun ajaran ini, bukan cuma dari
        // assignment yang sedang diproses.
        $existing = Schedule::where('tahun_ajaran_id', $tahunAjaranId)->get(['class_room_id', 'teacher_id', 'period_id']);

        $occupiedKelas = [];
        $occupiedGuru = [];
        $jamGuruTerpakai = [];
        foreach ($existing as $s) {
            $occupiedKelas["{$s->class_room_id}-{$s->period_id}"] = true;
            if ($s->teacher_id) {
                $occupiedGuru["{$s->teacher_id}-{$s->period_id}"] = true;
                $jamGuruTerpakai[$s->teacher_id] = ($jamGuruTerpakai[$s->teacher_id] ?? 0) + 1;
            }
        }

        $ditempatkan = 0;
        $gagal = [];

        DB::transaction(function () use ($assignments, $periods, $tahunAjaranId, &$occupiedKelas, &$occupiedGuru, &$jamGuruTerpakai, &$ditempatkan, &$gagal) {
            foreach ($assignments as $assignment) {
                $butuh = $assignment->target_jam - $assignment->schedules_count;
                $teacherId = $assignment->teacher_id;
                $maxJam = $assignment->teacher?->max_jam_mengajar;

                for ($i = 0; $i < $butuh; $i++) {
                    $slot = null;
                    $guruPenuh = false;

                    foreach ($periods as $period) {
                        if ($teacherId && $maxJam !== null && ($jamGuruTerpakai[$teacherId] ?? 0) >= $maxJam) {
                            $guruPenuh = true;
                            break;
                        }
                        if (isset($occupiedKelas["{$assignment->class_room_id}-{$period->id}"])) {
                            continue;
                        }
                        if ($teacherId && isset($occupiedGuru["{$teacherId}-{$period->id}"])) {
                            continue;
                        }
                        $slot = $period;
                        break;
                    }

                    if (!$slot) {
                        $gagal[] = [
                            'teaching_assignment_id' => $assignment->id,
                            'guru' => $assignment->teacher?->user?->name ?? '(belum ditentukan)',
                            'mapel' => $assignment->subject?->nama ?? '-',
                            'kelas' => $assignment->classRoom?->name ?? '-',
                            'kurang' => $butuh - $i,
                            'alasan' => $guruPenuh
                                ? "Guru sudah mencapai batas {$maxJam} jam/minggu."
                                : 'Tidak ada slot kosong yang cocok lagi (kelas/guru sudah terisi di semua jam tersisa).',
                        ];
                        break;
                    }

                    Schedule::create([
                        'period_id' => $slot->id,
                        'teaching_assignment_id' => $assignment->id,
                        'class_room_id' => $assignment->class_room_id,
                        'subject_id' => $assignment->subject_id,
                        'teacher_id' => $teacherId,
                        'tahun_ajaran_id' => $tahunAjaranId,
                        'kode' => $assignment->kode_guru,
                    ]);

                    $occupiedKelas["{$assignment->class_room_id}-{$slot->id}"] = true;
                    if ($teacherId) {
                        $occupiedGuru["{$teacherId}-{$slot->id}"] = true;
                        $jamGuruTerpakai[$teacherId] = ($jamGuruTerpakai[$teacherId] ?? 0) + 1;
                    }
                    $ditempatkan++;
                }
            }
        });

        return response()->json(['ditempatkan' => $ditempatkan, 'gagal' => $gagal]);
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

        // period_id kini global (tidak per tahun ajaran, lihat komentar di
        // atas), jadi cek bentrok WAJIB dibatasi tahun_ajaran_id — tanpa
        // ini, jadwal tahun ajaran lama yang kebetulan pakai period_id
        // yang sama ikut dianggap bentrok padahal sudah tidak relevan.
        if (Schedule::where('period_id', $data['period_id'])->where('class_room_id', $assignment->class_room_id)->where('tahun_ajaran_id', $assignment->tahun_ajaran_id)->exists()) {
            return response()->json(['message' => 'Kelas ini sudah punya jadwal di jam tersebut.'], 422);
        }

        if ($assignment->teacher_id && Schedule::where('period_id', $data['period_id'])->where('teacher_id', $assignment->teacher_id)->where('tahun_ajaran_id', $assignment->tahun_ajaran_id)->exists()) {
            return response()->json(['message' => 'Guru ini sudah mengajar kelas lain di jam yang sama.'], 422);
        }

        // Cek kuota + create() dikunci dalam 1 transaksi (lock baris
        // assignment) — tanpa ini, 2 request nyaris bersamaan (dobel klik,
        // atau 2 admin mengisi grid bersamaan) bisa sama-sama lolos cek
        // "$terpasang >= target_jam" sebelum salah satunya sempat create(),
        // membuat jam terpasang melebihi target_jam.
        $schedule = DB::transaction(function () use ($data, $assignment) {
            $assignment = TeachingAssignment::where('id', $assignment->id)->lockForUpdate()->first();

            if ($assignment->target_jam !== null) {
                $terpasang = Schedule::where('teaching_assignment_id', $assignment->id)->count();
                if ($terpasang >= $assignment->target_jam) {
                    return null;
                }
            }

            return Schedule::create([
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
        });

        if (!$schedule) {
            return response()->json(['message' => "Jam untuk penugasan ini sudah penuh ({$assignment->target_jam} jam)."], 422);
        }

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

        $periodBerubah = false;

        if (!empty($data['period_id']) && (int) $data['period_id'] !== $schedule->period_id) {
            $period = PeriodTemplate::findOrFail($data['period_id']);
            if ($period->tipe !== 'pelajaran') {
                return response()->json(['message' => 'Baris ini bertipe kegiatan khusus, tidak bisa diisi mata pelajaran per kelas.'], 422);
            }
            if (Schedule::where('period_id', $data['period_id'])->where('class_room_id', $schedule->class_room_id)->where('tahun_ajaran_id', $schedule->tahun_ajaran_id)->where('id', '!=', $schedule->id)->exists()) {
                return response()->json(['message' => 'Kelas ini sudah punya jadwal di jam tersebut.'], 422);
            }
            if ($schedule->teacher_id && Schedule::where('period_id', $data['period_id'])->where('teacher_id', $schedule->teacher_id)->where('tahun_ajaran_id', $schedule->tahun_ajaran_id)->where('id', '!=', $schedule->id)->exists()) {
                return response()->json(['message' => 'Guru ini sudah mengajar kelas lain di jam yang sama.'], 422);
            }
            $schedule->period_id = $data['period_id'];
            $periodBerubah = true;
        }

        if (array_key_exists('kode', $data)) {
            $schedule->kode = $data['kode'];
        }

        $schedule->save();
        $schedule = $schedule->fresh(['subject', 'teacher.user']);

        if ($periodBerubah) {
            $this->notifyJadwalBerubah($schedule, 'jam pelajaran dipindahkan.');
        }

        return $schedule;
    }

    public function destroy(Schedule $schedule)
    {
        if ($schedule->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Isian jadwal ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus.'], 422);
        }

        $this->notifyJadwalBerubah($schedule, 'jadwal dihapus dari jam ini.');

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

    /**
     * Jadwal mengajar 1 guru — dipakai widget "Jadwal Mengajar" di Beranda
     * dashboard Guru. Beda dari gridUntukKelas() (yang difilter per kelas):
     * di sini schedules-nya difilter per teacher_id, jadi bisa merentang
     * beberapa kelas berbeda dalam 1 minggu — tapi tetap maksimal 1 isian
     * per jam (guru tidak mungkin mengajar 2 kelas di jam yang sama, sudah
     * dicegah waktu isi jadwal di ScheduleController::store()).
     */
    public function myTeachingSchedule(Request $request)
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return response()->json(['message' => 'Akun ini tidak terdaftar sebagai guru.'], 403);
        }

        $tahunAjaranId = TahunAjaran::aktifId();

        $periods = PeriodTemplate::orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
            ->orderBy('waktu_mulai')
            ->get();

        $schedules = Schedule::with(['subject', 'classRoom'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->where('teacher_id', $teacher->id)
            ->get();

        return response()->json(['periods' => $periods, 'schedules' => $schedules]);
    }
}
