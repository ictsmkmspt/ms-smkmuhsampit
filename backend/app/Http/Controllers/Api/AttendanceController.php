<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\RestrictsGuruToOwnClass;
use App\Models\Attendance;
use App\Models\ClassRoom;
use App\Models\Holiday;
use App\Models\PklPlacement;
use App\Models\Setting;
use App\Models\Student;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\Violation;
use App\Models\ViolationType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    use RestrictsGuruToOwnClass;

    /**
     * Siswa yang sedang PKL PADA TANGGAL tertentu — dicek dari rentang
     * tanggal_mulai/tanggal_selesai penempatan, BUKAN dari status aktif/selesai
     * penempatan SEKARANG. Kalau pakai status='aktif', begitu penempatan lama
     * ditutup (jadi 'selesai'), riwayat hari-hari lama yang sebenarnya PKL akan
     * salah jatuh jadi 'alpa' karena tidak ketemu lagi di query status aktif.
     */
    private function siswaPklPadaTanggal(string $date, ?array $studentIds = null): array
    {
        $query = PklPlacement::where('tanggal_mulai', '<=', $date)
            ->where('tanggal_selesai', '>=', $date);
        if ($studentIds !== null) {
            $query->whereIn('student_id', $studentIds);
        }
        return $query->pluck('student_id')->all();
    }

    public function scan(Request $request)
    {
        $request->validate(['code' => 'required|string']);

        $student = Student::with('user')->where('qr_code', $request->code)->first();

        if (!$student) {
            throw ValidationException::withMessages([
                'code' => ['QR Code tidak dikenali / siswa tidak ditemukan.'],
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
            ->where('status', 'aktif')
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

        // Ambil semua penempatan PKL yang rentang tanggalnya bersinggungan dengan
        // bulan ini (bukan cuma status='aktif' sekarang) — supaya hari-hari lama
        // yang siswanya sedang PKL tetap tercatat 'pkl', walau penempatannya sudah
        // ditutup/selesai sekarang.
        $pklPlacements = PklPlacement::whereIn('student_id', $students->pluck('id'))
            ->where('tanggal_mulai', '<=', $endDate)
            ->where('tanggal_selesai', '>=', $startDate)
            ->get(['student_id', 'tanggal_mulai', 'tanggal_selesai'])
            ->groupBy('student_id');

        $hasil = $students->map(function ($student) use ($attendances, $pklPlacements, $daysInMonth, $request, $today) {
            $records    = $attendances->get($student->id, collect())->keyBy('date');
            $placements = $pklPlacements->get($student->id, collect());
            $days    = [];
            $counts  = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpa' => 0, 'libur' => 0, 'pkl' => 0];

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

                $sedangPkl = $placements->first(fn ($p) => $p->tanggal_mulai <= $date && $p->tanggal_selesai >= $date);
                if ($sedangPkl) {
                    $days[$d] = 'pkl';
                    $counts['pkl']++;
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
            ->where('status', 'aktif')
            ->join('users', 'users.id', '=', 'students.user_id')
            ->orderBy('users.name')
            ->select('students.*')
            ->get();

        $attendances = Attendance::where('date', $date)->where('class_room_id', $classRoom->id)
            ->get()->keyBy('student_id');

        $siswaPkl = $this->siswaPklPadaTanggal($date);

        $hasil = $students->map(function ($student) use ($attendances, $date, $siswaPkl) {
            $att = $attendances->get($student->id);
            if ($att) {
                return ['id' => $att->id, 'student' => $student, 'date' => $date, 'time_in' => $att->time_in, 'status' => $att->status];
            }
            if (in_array($student->id, $siswaPkl, true)) {
                return ['id' => 'pkl-' . $student->id, 'student' => $student, 'date' => $date, 'time_in' => null, 'status' => 'pkl'];
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
        $siswaPkl = $this->siswaPklPadaTanggal($date);

        $alpaStudents = Student::where('status', 'aktif')
            ->whereNotIn('id', $studentsAlreadyAbsent)
            ->whereNotIn('id', $siswaPkl)
            ->with('user')->get();

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

        // Sama seperti violationUpdate()/violationDestroy() — koreksi cuma
        // boleh untuk tanggal yang masuk rentang tahun ajaran yang SEDANG
        // aktif. Tanpa guard ini, tanggal dari tahun ajaran lama bisa
        // dikoreksi lewat sini dan poin pelanggarannya (tambah/kurang)
        // salah tertimpa ke total_poin tahun ajaran yang BERBEDA (tahun
        // berjalan), bukan ke tahun ajaran asal datanya.
        $tahunAktif = TahunAjaran::where('status', 'aktif')->first();
        if (!$tahunAktif) {
            return response()->json(['message' => 'Tidak ada tahun ajaran yang sedang aktif. Aktifkan dulu tahun ajaran di menu Pengaturan sebelum mengoreksi absensi.'], 422);
        }
        if ($date < $tahunAktif->tanggal_mulai || $date > $tahunAktif->tanggal_selesai) {
            return response()->json(['message' => 'Tanggal ini berada di luar rentang tahun ajaran yang sedang aktif, tidak bisa dikoreksi lewat sini. Aktifkan dulu tahun ajaran yang sesuai kalau perlu mengoreksi data tanggal ini.'], 422);
        }

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

    /**
     * Laporan absensi harian (opsional filter class_room_id). Kalau yang login guru,
     * class_room_id dari request DIABAIKAN dan diganti otomatis dengan kelas walinya
     * sendiri (sama seperti myClassReport/monthlyReport) — guru tidak boleh intip
     * laporan kelas lain lewat endpoint ini.
     */
    public function report(Request $request)
    {
        $date = $request->date ?? now()->format('Y-m-d');

        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;

        if ($restricted !== null && !ClassRoom::find($restricted)) {
            return response()->json(['message' => 'Anda belum ditugaskan sebagai wali kelas.'], 403);
        }

        $studentsQuery = Student::with(['user', 'classRoom'])->where('status', 'aktif');
        if ($classRoomId) {
            $studentsQuery->where('class_room_id', $classRoomId);
        }
        $students = $studentsQuery->get();

        $attendanceQuery = Attendance::where('date', $date);
        if ($classRoomId) {
            $attendanceQuery->where('class_room_id', $classRoomId);
        }
        $attendances = $attendanceQuery->get()->keyBy('student_id');

        $isLibur = Holiday::isHariLibur($date);
        $siswaPkl = $this->siswaPklPadaTanggal($date);

        $hasil = $students->map(function ($student) use ($attendances, $date, $isLibur, $siswaPkl) {
            $attendance = $attendances->get($student->id);
            if ($attendance) {
                return ['id' => $attendance->id, 'student' => $student, 'date' => $date, 'time_in' => $attendance->time_in, 'status' => $attendance->status];
            }
            if (in_array($student->id, $siswaPkl, true)) {
                return ['id' => 'pkl-' . $student->id, 'student' => $student, 'date' => $date, 'time_in' => null, 'status' => 'pkl'];
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
     * Default pakai kolom total_poin (cache, cepat) untuk tahun ajaran aktif. Kalau
     * ?tahun_ajaran_id= diisi dengan tahun ajaran LAIN, dihitung ulang live dari riwayat
     * Violation tahun itu — supaya tidak perlu ubah tahun ajaran aktif cuma buat lihat rekap lama.
     */
    public function violationReport(Request $request)
    {
        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? (int) $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $query = Student::with(['user', 'classRoom'])->where('status', 'aktif');
        if ($classRoomId) $query->where('class_room_id', $classRoomId);

        // alpa_count DIHITUNG dari Violation type='alpa' — alpa SENGAJA
        // tidak bikin baris Attendance sama sekali (lihat processAlpa()/
        // attendanceManual()/updateStatus()), jadi hitungannya tidak bisa
        // dari tabel attendances.
        if ($tahunAjaranId === TahunAjaran::aktifId()) {
            return $query->withCount(['violations as alpa_count' => function ($q) use ($tahunAjaranId) {
                    $q->where('type', 'alpa')->where('tahun_ajaran_id', $tahunAjaranId);
                }])
                ->orderByDesc('total_poin')->get();
        }

        return $query->withSum(['violations as riwayat_poin' => function ($q) use ($tahunAjaranId) {
                $q->where('tahun_ajaran_id', $tahunAjaranId);
            }], 'poin')
            ->withCount(['violations as alpa_count' => function ($q) use ($tahunAjaranId) {
                $q->where('type', 'alpa')->where('tahun_ajaran_id', $tahunAjaranId);
            }])
            ->get()
            ->each(function ($s) {
                $s->total_poin = (int) ($s->riwayat_poin ?? 0);
                unset($s->riwayat_poin);
            })
            ->sortByDesc('total_poin')
            ->values();
    }

    /**
     * Riwayat kejadian pelanggaran. Kalau yang login guru, dipaksa hanya kelas walinya sendiri.
     * Default cuma tahun ajaran yang sedang aktif — kirim ?tahun_ajaran_id= untuk lihat tahun
     * ajaran lain, atau ?semua_tahun=1 untuk lihat semua tahun ajaran sekaligus.
     */
    public function violationDetail(Request $request)
    {
        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;

        $query = Violation::with('student.user', 'student.classRoom', 'violationType');
        if ($request->date) $query->where('date', $request->date);
        if ($classRoomId) $query->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        if (!$request->boolean('semua_tahun')) {
            $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }
        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }

    /**
     * Riwayat pelanggaran 1 siswa tertentu, dengan filter opsional
     * rentang tanggal (date_from/date_to) dan jenis pelanggaran (violation_type_id).
     * Dipakai oleh popup riwayat pelanggaran di halaman Rekap Poin Pelanggaran.
     * Kalau yang login guru, hanya boleh melihat siswa di kelas walinya sendiri.
     * Default cuma tahun ajaran yang sedang aktif — kirim ?tahun_ajaran_id= untuk lihat
     * tahun ajaran lain, atau ?semua_tahun=1 untuk lihat semua.
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
        if (!$request->boolean('semua_tahun')) {
            $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }

    /**
     * Hapus 1 catatan pelanggaran yang salah input, dan kembalikan poinnya dari total_poin siswa.
     * Pelanggaran otomatis (alpa) tidak boleh dihapus di sini karena terikat ke data kehadiran;
     * harus dikoreksi lewat menu Rekap Absensi. Kalau yang login guru, hanya boleh menghapus
     * siswa di kelas walinya sendiri.
     */
    public function violationDestroy(Request $request, $id)
    {
        $violation = Violation::with('student')->find($id);
        if (!$violation) {
            return response()->json(['message' => 'Catatan pelanggaran tidak ditemukan.'], 404);
        }
        if ($violation->type === 'alpa') {
            return response()->json(['message' => 'Pelanggaran alpa tidak bisa dihapus di sini. Ubah lewat menu Rekap Absensi.'], 422);
        }

        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null && $violation->student->class_room_id !== $restricted) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus data siswa ini.'], 403);
        }

        if ($violation->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Catatan ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus. Aktifkan dulu tahun ajaran tersebut kalau perlu mengoreksinya.'], 422);
        }

        DB::transaction(function () use ($violation) {
            $violation->student->tambahPoin(-$violation->poin);
            $violation->delete();
        });

        return response()->json(['message' => 'Catatan pelanggaran berhasil dihapus.']);
    }

    /**
     * Ubah jenis pelanggaran dan/atau catatan pada 1 catatan pelanggaran yang salah input.
     * Poin otomatis ikut menyesuaikan ke poin jenis pelanggaran yang baru, dan total_poin
     * siswa disesuaikan (poin lama dikembalikan, poin baru ditambahkan). Pelanggaran alpa
     * tidak boleh diubah di sini. Kalau yang login guru, hanya boleh mengubah siswa di kelas
     * walinya sendiri.
     */
    public function violationUpdate(Request $request, $id)
    {
        $violation = Violation::with('student')->find($id);
        if (!$violation) {
            return response()->json(['message' => 'Catatan pelanggaran tidak ditemukan.'], 404);
        }
        if ($violation->type === 'alpa') {
            return response()->json(['message' => 'Pelanggaran alpa tidak bisa diubah di sini. Ubah lewat menu Rekap Absensi.'], 422);
        }

        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null && $violation->student->class_room_id !== $restricted) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah data siswa ini.'], 403);
        }

        if ($violation->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Catatan ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah. Aktifkan dulu tahun ajaran tersebut kalau perlu mengoreksinya.'], 422);
        }

        $data = $request->validate([
            'violation_type_id' => 'required|exists:violation_types,id',
            'note'              => 'nullable|string|max:255',
        ]);

        $newType = ViolationType::findOrFail($data['violation_type_id']);

        DB::transaction(function () use ($violation, $newType, $data) {
            $violation->student->tambahPoin($newType->poin - $violation->poin);
            $violation->update([
                'violation_type_id' => $newType->id,
                'poin'              => $newType->poin,
                'note'              => $data['note'] ?? $violation->note,
            ]);
        });

        return response()->json([
            'message'   => 'Catatan pelanggaran berhasil diperbarui.',
            'violation' => $violation->fresh(),
        ]);
    }


    /**
     * Status absensi HARI INI apa adanya, tanpa tebak-tebakan pkl/libur/alpa
     * (beda dari report() di atas yang buat kebutuhan laporan). Dipakai
     * KehadiranSection di dashboard Guru: (1) dengan class_room_id, supaya
     * status yang sudah tercatat tetap tampil walau ganti kelas/reload;
     * (2) tanpa class_room_id, buat daftar "Belum Absensi Hari Ini" se-sekolah.
     * Sengaja TIDAK dibatasi ke kelas wali (beda dari report()) — sama seperti
     * attendanceManual(), semua guru boleh input/lihat status kelas manapun.
     * Alpa dicek dari tabel Violation (type=alpa), bukan Attendance, karena
     * attendanceManual() memang tidak membuat catatan Attendance buat alpa.
     */
    public function todayStatus(Request $request)
    {
        $request->validate([
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        $today = now()->format('Y-m-d');

        $students = Student::with(['user', 'classRoom'])
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->class_room_id))
            ->where('students.status', 'aktif')
            ->join('users', 'users.id', '=', 'students.user_id')
            ->join('class_rooms', 'class_rooms.id', '=', 'students.class_room_id')
            ->orderBy('class_rooms.name')
            ->orderBy('users.name')
            ->select('students.*')
            ->get();

        $attendances = Attendance::where('date', $today)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()->keyBy('student_id');

        $alpaIds = Violation::where('date', $today)->where('type', 'alpa')
            ->whereIn('student_id', $students->pluck('id'))
            ->pluck('student_id');

        $hasil = $students->map(function ($student) use ($attendances, $alpaIds) {
            $status = $attendances->get($student->id)?->status;
            if (!$status && $alpaIds->contains($student->id)) {
                $status = 'alpa';
            }
            return ['student' => $student, 'date' => now()->format('Y-m-d'), 'status' => $status];
        });

        return response()->json(['date' => $today, 'students' => $hasil]);
    }

    /**
     * Catat kehadiran secara manual (hadir/izin/sakit) tanpa scan QR Code.
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

        DB::transaction(function () use ($student, $today, $data, $request) {
            // Alpa TIDAK bikin baris attendances (lihat komentar di atas),
            // jadi cek $existing tadi tidak akan pernah menangkap alpa hari
            // ini. Kalau siswa ternyata sudah kadung ditandai alpa hari ini
            // (lewat tombol "Proses Alpa" atau form ini sebelumnya) dan
            // sekarang dikoreksi jadi hadir/izin/sakit, poin alpa yang
            // sudah kadung masuk HARUS dibatalkan dulu — sama seperti
            // updateStatus() menangani transisi alpa -> non-alpa.
            $oldAlpa = Violation::where('student_id', $student->id)
                ->where('date', $today)->where('type', 'alpa')->first();
            if ($oldAlpa) {
                $student->tambahPoin(-$oldAlpa->poin);
                $oldAlpa->delete();
            }

            Attendance::create([
                'student_id'    => $student->id,
                'class_room_id' => $student->class_room_id,
                'date'          => $today,
                'time_in'       => now()->format('H:i:s'),
                'status'        => $data['status'],
                'scanned_by'    => $request->user()->id,
            ]);
        });

        return response()->json([
            'message' => 'Absensi manual berhasil: ' . $student->user->name . ' (' . $data['status'] . ')',
        ]);
    }
}

