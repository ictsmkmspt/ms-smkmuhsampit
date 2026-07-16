<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassRoom;
use App\Models\Holiday;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Violation;
use App\Models\ViolationType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    /**
     * Kalau user yang login adalah guru, kembalikan ID kelas di mana dia jadi wali kelas
     * (atau -1 kalau belum ditugaskan sama sekali, supaya query jadi "tidak ada hasil"
     * bukan malah bocor lihat semua kelas). Kalau bukan guru (misal admin), kembalikan null
     * yang artinya "tidak ada pembatasan".
     */
    private function guruClassRoomId(Request $request): ?int
    {
        if ($request->user()->role !== 'guru') {
            return null;
        }

        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return -1;
        }

        $classRoom = ClassRoom::where('homeroom_teacher_id', $teacher->id)->first();
        return $classRoom?->id ?? -1;
    }

    public function scan(Request $request)
    {
        $request->validate(['code' => 'required|string']);

        $student = Student::with('user')->where('barcode_code', $request->code)->first();

        if (!$student) {
            throw ValidationException::withMessages([
                'code' => ['Barcode tidak dikenali / siswa tidak ditemukan.'],
            ]);
        }

        $jamMulai    = Setting::get('jam_masuk_mulai', '06:00') . ':00';
        $jamTutup    = Setting::get('jam_masuk_tutup', '09:00') . ':00';
        $jamSekarang = now()->format('H:i:s');

        if ($jamSekarang < $jamMulai) {
            return response()->json([
                'message' => 'Absen belum dibuka. Waktu absen mulai pukul ' . Setting::get('jam_masuk_mulai', '06:00') . '.',
                'already_scanned' => false, 'ditolak' => true,
            ]);
        }

        if ($jamSekarang > $jamTutup) {
            return response()->json([
                'message' => 'Waktu absen sudah ditutup sejak pukul ' . Setting::get('jam_masuk_tutup', '09:00') . '.',
                'already_scanned' => false, 'ditolak' => true,
            ]);
        }

        $today    = now()->format('Y-m-d');
        $existing = Attendance::where('student_id', $student->id)->where('date', $today)->first();

        if ($existing) {
            return response()->json([
                'message' => $student->user->name . ' sudah absen hari ini pukul ' . $existing->time_in,
                'student' => $student, 'already_scanned' => true,
            ]);
        }

        return DB::transaction(function () use ($student, $today, $jamSekarang, $request) {
            $attendance = Attendance::create([
                'student_id' => $student->id, 'class_room_id' => $student->class_room_id,
                'date' => $today, 'time_in' => $jamSekarang,
                'status' => 'hadir', 'scanned_by' => $request->user()->id,
            ]);

            return response()->json([
                'message' => 'Absensi berhasil: ' . $student->user->name . ' (hadir)',
                'student' => $student->fresh(), 'attendance' => $attendance, 'already_scanned' => false,
            ]);
        });
    }

    /**
     * Data matriks absensi 1 bulan penuh untuk 1 kelas (dipakai halaman cetak/print).
     * Kalau yang login guru, class_room_id dari request DIABAIKAN dan diganti otomatis
     * dengan kelas walinya sendiri.
     */
    public function monthlyReport(Request $request)
    {
        $request->validate([
            'class_room_id' => 'required|exists:class_rooms,id',
            'month'         => 'required|integer|min:1|max:12',
            'year'          => 'required|integer|min:2000|max:2100',
        ]);

        $restricted   = $this->guruClassRoomId($request);
        $classRoomId  = $restricted ?? $request->class_room_id;

        $classRoom = ClassRoom::find($classRoomId);
        if (!$classRoom) {
            return response()->json(['message' => 'Anda belum ditugaskan sebagai wali kelas.'], 403);
        }

        $students = Student::with('user')->where('class_room_id', $classRoom->id)
            ->join('users', 'users.id', '=', 'students.user_id')
            ->orderBy('users.name')
            ->select('students.*')
            ->get();

        $daysInMonth = Carbon::createFromDate($request->year, $request->month, 1)->daysInMonth;
        $today       = now()->format('Y-m-d');
        $startDate   = sprintf('%04d-%02d-01', $request->year, $request->month);
        $endDate     = sprintf('%04d-%02d-%02d', $request->year, $request->month, $daysInMonth);

        $attendances = Attendance::whereIn('student_id', $students->pluck('id'))
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->groupBy('student_id');

        $hasil = $students->map(function ($student) use ($attendances, $daysInMonth, $request, $today) {
            $records = $attendances->get($student->id, collect())->keyBy('date');
            $days    = [];
            $counts  = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpa' => 0, 'libur' => 0];

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $date = sprintf('%04d-%02d-%02d', $request->year, $request->month, $d);

                if ($date > $today) {
                    $days[$d] = null; // tanggal belum terjadi, biarkan kosong
                    continue;
                }

                $att = $records->get($date);
                if ($att) {
                    $days[$d] = $att->status;
                    $counts[$att->status] = ($counts[$att->status] ?? 0) + 1;
                    continue;
                }

                if (Holiday::isHariLibur($date)) {
                    $days[$d] = 'libur';
                    $counts['libur']++;
                    continue;
                }

                $days[$d] = 'alpa';
                $counts['alpa']++;
            }

            return [
                'student' => $student,
                'days'    => $days,
                'counts'  => $counts,
            ];
        });

        return response()->json([
            'class_room'    => $classRoom,
            'month'         => (int) $request->month,
            'year'          => (int) $request->year,
            'days_in_month' => $daysInMonth,
            'students'      => $hasil,
        ]);
    }

    /**
     * Laporan absensi khusus untuk guru yang login, otomatis dibatasi ke kelas
     * di mana dia menjadi wali kelas (tidak ada filter kelas manual).
     */
    public function myClassReport(Request $request)
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();

        if (!$teacher) {
            return response()->json(['message' => 'Akun ini tidak terdaftar sebagai guru.'], 403);
        }

        $classRoom = ClassRoom::where('homeroom_teacher_id', $teacher->id)->first();

        if (!$classRoom) {
            return response()->json([
                'message'    => 'Anda belum ditugaskan sebagai wali kelas oleh admin.',
                'class_room' => null,
                'students'   => [],
            ]);
        }

        $date = $request->date ?? now()->format('Y-m-d');

        $students = Student::with('user')->where('class_room_id', $classRoom->id)
            ->join('users', 'users.id', '=', 'students.user_id')
            ->orderBy('users.name')
            ->select('students.*')
            ->get();

        $attendances = Attendance::where('date', $date)->where('class_room_id', $classRoom->id)
            ->get()->keyBy('student_id');

        $hasil = $students->map(function ($student) use ($attendances, $date) {
            $att = $attendances->get($student->id);
            if ($att) {
                return ['id' => $att->id, 'student' => $student, 'date' => $date, 'time_in' => $att->time_in, 'status' => $att->status];
            }
            if (Holiday::isHariLibur($date)) {
                return ['id' => 'libur-' . $student->id, 'student' => $student, 'date' => $date, 'time_in' => null, 'status' => 'libur'];
            }
            return ['id' => 'alpa-' . $student->id, 'student' => $student, 'date' => $date, 'time_in' => null, 'status' => 'alpa'];
        });

        return response()->json([
            'class_room'  => $classRoom,
            'date'        => $date,
            'is_libur'    => Holiday::isHariLibur($date),
            'keterangan_libur' => Holiday::keterangan($date),
            'students'    => $hasil,
        ]);


    }

    public function processAlpa(Request $request)
    {

        $date = $request->date ?? now()->format('Y-m-d');

        if (Holiday::isHariLibur($date)) {
            return response()->json([
                'message' => 'Tanggal ' . $date . ' adalah hari libur (' . Holiday::keterangan($date) . '). Proses alpa tidak dijalankan.',
                'siswa_alpa' => [],
                'ditolak_karena_libur' => true,
            ]);
        }

        $studentsAlreadyAbsent = Attendance::where('date', $date)->pluck('student_id');

        $alpaStudents = Student::whereNotIn('id', $studentsAlreadyAbsent)->with('user')->get();

        $jenisAlpa = ViolationType::where('system_key', 'alpa')->first();
        $poinAlpa  = $jenisAlpa?->poin ?? 10;
        $diproses  = [];

        DB::transaction(function () use ($alpaStudents, $date, $poinAlpa, $jenisAlpa, $request, &$diproses) {
            foreach ($alpaStudents as $student) {
                $sudahAda = Violation::where('student_id', $student->id)->where('date', $date)->where('type', 'alpa')->exists();
                if ($sudahAda) continue;

                Violation::create([
                    'student_id' => $student->id, 'attendance_id' => null,
                    'violation_type_id' => $jenisAlpa?->id,
                    'date' => $date, 'type' => 'alpa', 'poin' => $poinAlpa,
                    'recorded_by' => $request->user()->id,
                ]);

                $student->tambahPoin($poinAlpa);
                $diproses[] = $student->user->name;
            }
        });

        return response()->json([
            'message' => count($diproses) > 0
                ? count($diproses) . ' siswa ditandai alpa untuk tanggal ' . $date . '.'
                : 'Tidak ada siswa yang perlu ditandai alpa.',
            'siswa_alpa' => $diproses,
        ]);
    }

    /**
     * Ubah status kehadiran (hadir/izin/sakit/alpa) DAN/ATAU jam masuk untuk 1 tanggal tertentu.
     * Dipakai oleh jendela edit di menu Rekap Absensi (admin & guru). "Hapus" juga memanggil
     * endpoint ini dengan status=alpa (menghapus catatan kehadiran + mencatat poin alpa).
     * Kalau yang login guru, hanya boleh mengubah siswa yang ada di kelas walinya sendiri.
     */
    public function updateStatus(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date'       => 'required|date',
            'status'     => 'required|in:hadir,izin,sakit,alpa',
            'time_in'    => 'nullable|date_format:H:i',
        ]);

        $student = Student::with('user')->findOrFail($data['student_id']);

        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null && $student->class_room_id !== $restricted) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah data siswa ini.'], 403);
        }

        $date      = $data['date'];
        $newStatus = $data['status'];
        $timeIn    = $data['time_in'] ?? null;

        return DB::transaction(function () use ($student, $date, $newStatus, $timeIn, $request) {
            $attendance = Attendance::where('student_id', $student->id)->where('date', $date)->first();
            $oldStatus  = $attendance ? $attendance->status : 'alpa';

            // 1. Batalkan poin pelanggaran alpa lama, kalau status berubah dari alpa.
            if ($oldStatus === 'alpa' && $newStatus !== 'alpa') {
                $oldViolation = Violation::where('student_id', $student->id)
                    ->where('date', $date)->where('type', 'alpa')->first();
                if ($oldViolation) {
                    $student->tambahPoin(-$oldViolation->poin);
                    $oldViolation->delete();
                }
            }

            // 2. Terapkan status + jam masuk baru ke tabel attendances.
            if ($newStatus === 'alpa') {
                if ($attendance) $attendance->delete();
                $attendance = null;

                if ($oldStatus !== 'alpa') {
                    $jenis = ViolationType::where('system_key', 'alpa')->first();
                    $poin  = $jenis?->poin ?? 10;

                    Violation::create([
                        'student_id' => $student->id, 'attendance_id' => null,
                        'violation_type_id' => $jenis?->id, 'date' => $date,
                        'type' => 'alpa', 'poin' => $poin, 'recorded_by' => $request->user()->id,
                    ]);
                    $student->tambahPoin($poin);
                }
            } elseif ($attendance) {
                $attendance->update([
                    'status'  => $newStatus,
                    'time_in' => $timeIn ?? $attendance->time_in,
                ]);
            } else {
                $attendance = Attendance::create([
                    'student_id' => $student->id, 'class_room_id' => $student->class_room_id,
                    'date' => $date, 'time_in' => $timeIn ?? now()->format('H:i:s'),
                    'status' => $newStatus, 'scanned_by' => $request->user()->id,
                ]);
            }

            return response()->json([
                'message' => 'Data kehadiran ' . $student->user->name . ' berhasil diperbarui.',
            ]);
        });
    }

    public function recordManual(Request $request)
    {
        $data = $request->validate([
            'student_id'        => 'required|exists:students,id',
            'violation_type_id' => 'required|exists:violation_types,id',
            'note'              => 'nullable|string|max:255',
        ]);

        $violationType = ViolationType::find($data['violation_type_id']);
        $student = Student::with('user')->find($data['student_id']);

        $violation = DB::transaction(function () use ($student, $violationType, $data, $request) {
            $v = Violation::create([
                'student_id' => $student->id, 'attendance_id' => null,
                'violation_type_id' => $violationType->id,
                'date' => now()->format('Y-m-d'), 'type' => 'manual',
                'poin' => $violationType->poin,
                'note' => $data['note'] ?? null, 'recorded_by' => $request->user()->id,
            ]);
            $student->tambahPoin($violationType->poin);
            return $v;
        });

        return response()->json([
            'message'   => 'Pelanggaran "' . $violationType->name . '" dicatat untuk ' . $student->user->name . ' (+' . $violationType->poin . ' poin).',
            'violation' => $violation,
        ], 201);
    }

    public function report(Request $request)
    {
        $date = $request->date ?? now()->format('Y-m-d');

        $studentsQuery = Student::with(['user', 'classRoom']);
        if ($request->class_room_id) {
            $studentsQuery->where('class_room_id', $request->class_room_id);
        }
        $students = $studentsQuery->get();

        $attendanceQuery = Attendance::where('date', $date);
        if ($request->class_room_id) {
            $attendanceQuery->where('class_room_id', $request->class_room_id);
        }
        $attendances = $attendanceQuery->get()->keyBy('student_id');

        $isLibur = Holiday::isHariLibur($date);

        $hasil = $students->map(function ($student) use ($attendances, $date, $isLibur) {
            $attendance = $attendances->get($student->id);
            if ($attendance) {
                return ['id' => $attendance->id, 'student' => $student, 'date' => $date, 'time_in' => $attendance->time_in, 'status' => $attendance->status];
            }
            if ($isLibur) {
                return ['id' => 'libur-' . $student->id, 'student' => $student, 'date' => $date, 'time_in' => null, 'status' => 'libur'];
            }
            return ['id' => 'alpa-' . $student->id, 'student' => $student, 'date' => $date, 'time_in' => null, 'status' => 'alpa'];
        });

        return $hasil->sortBy([
            fn ($a, $b) => ($a['status'] === 'alpa') <=> ($b['status'] === 'alpa'),
            fn ($a, $b) => $a['student']->user->name <=> $b['student']->user->name,
        ])->values();

    }

    /**
     * Rekap akumulasi poin per siswa. Kalau yang login guru, dipaksa hanya kelas walinya sendiri.
     */
    public function violationReport(Request $request)
    {
        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;

        $query = Student::with(['user', 'classRoom']);
        if ($classRoomId) $query->where('class_room_id', $classRoomId);
        return $query->orderByDesc('total_poin')->get();
    }

    /**
     * Riwayat kejadian pelanggaran. Kalau yang login guru, dipaksa hanya kelas walinya sendiri.
     */
    public function violationDetail(Request $request)
    {
        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;

        $query = Violation::with('student.user', 'student.classRoom', 'violationType');
        if ($request->date) $query->where('date', $request->date);
        if ($classRoomId) $query->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }

    /**
     * Riwayat pelanggaran 1 siswa tertentu, dengan filter opsional
     * rentang tanggal (date_from/date_to) dan jenis pelanggaran (violation_type_id).
     * Dipakai oleh popup riwayat pelanggaran di halaman Rekap Poin Pelanggaran.
     * Kalau yang login guru, hanya boleh melihat siswa di kelas walinya sendiri.
     */
    public function studentViolations(Request $request, $studentId)
    {
        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null) {
            $student = Student::find($studentId);
            if (!$student || $student->class_room_id !== $restricted) {
                return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
            }
        }

        $query = Violation::with('violationType')
            ->where('student_id', $studentId);

        if ($request->date_from) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->violation_type_id) {
            $query->where('violation_type_id', $request->violation_type_id);
        }

        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }

    /**
     * Catat kehadiran secara manual (hadir/izin/sakit) tanpa scan barcode.
     * Dipanggil dari form Absensi Manual di halaman Guru.
     */
    public function attendanceManual(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'status'     => 'required|in:hadir,izin,sakit,alpa',
        ]);

        $student = Student::with('user')->find($data['student_id']);
        $today   = now()->format('Y-m-d');

        $existing = Attendance::where('student_id', $student->id)
            ->where('date', $today)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => $student->user->name . ' sudah tercatat absen hari ini pukul ' . $existing->time_in . ' (status: ' . $existing->status . ').',
            ], 422);
        }

        // Alpa tidak membuat catatan kehadiran (memang begitu konsepnya: alpa = tidak ada
        // catatan). Cukup langsung catat poin pelanggarannya sekali, tanpa nunggu tombol
        // "Proses Alpa Hari Ini".
        if ($data['status'] === 'alpa') {
            $sudahAlpa = Violation::where('student_id', $student->id)
                ->where('date', $today)->where('type', 'alpa')->exists();

            if ($sudahAlpa) {
                return response()->json([
                    'message' => $student->user->name . ' sudah tercatat alpa hari ini.',
                ], 422);
            }

            $jenisAlpa = ViolationType::where('system_key', 'alpa')->first();
            $poinAlpa  = $jenisAlpa?->poin ?? 10;

            Violation::create([
                'student_id' => $student->id, 'attendance_id' => null,
                'violation_type_id' => $jenisAlpa?->id,
                'date' => $today, 'type' => 'alpa', 'poin' => $poinAlpa,
                'recorded_by' => $request->user()->id,
            ]);
            $student->tambahPoin($poinAlpa);

            return response()->json([
                'message' => 'Absensi manual berhasil: ' . $student->user->name . ' (alpa)',
            ]);
        }

        Attendance::create([
            'student_id'    => $student->id,
            'class_room_id' => $student->class_room_id,
            'date'          => $today,
            'time_in'       => now()->format('H:i:s'),
            'status'        => $data['status'],
            'scanned_by'    => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Absensi manual berhasil: ' . $student->user->name . ' (' . $data['status'] . ')',
        ]);
    }
}

