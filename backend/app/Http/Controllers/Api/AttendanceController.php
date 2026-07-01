<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Violation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
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
        $jamBatas    = Setting::get('jam_masuk_batas', '07:30') . ':00';
        $jamTutup    = Setting::get('jam_masuk_tutup', '09:00') . ':00';
        $jamSekarang = now()->format('H:i:s');

        if ($jamSekarang < $jamMulai) {
            return response()->json([
                'message' => 'Absen belum dibuka. Waktu absen mulai pukul ' . Setting::get('jam_masuk_mulai', '06:00') . '.',
                'already_scanned' => false,
                'ditolak' => true,
            ]);
        }

        if ($jamSekarang > $jamTutup) {
            return response()->json([
                'message' => 'Waktu absen sudah ditutup sejak pukul ' . Setting::get('jam_masuk_tutup', '09:00') . '.',
                'already_scanned' => false,
                'ditolak' => true,
            ]);
        }

        $today    = now()->format('Y-m-d');
        $existing = Attendance::where('student_id', $student->id)->where('date', $today)->first();

        if ($existing) {
            return response()->json([
                'message'         => $student->user->name . ' sudah absen hari ini pukul ' . $existing->time_in,
                'student'         => $student,
                'already_scanned' => true,
            ]);
        }

        $status = $jamSekarang > $jamBatas ? 'telat' : 'hadir';

        return DB::transaction(function () use ($student, $today, $jamSekarang, $status, $request) {
            $attendance = Attendance::create([
                'student_id'    => $student->id,
                'class_room_id' => $student->class_room_id,
                'date'          => $today,
                'time_in'       => $jamSekarang,
                'status'        => $status,
                'scanned_by'    => $request->user()->id,
            ]);

            if ($status === 'telat') {
                $poinTelat = (int) Setting::get('poin_telat', '5');

                Violation::create([
                    'student_id'    => $student->id,
                    'attendance_id' => $attendance->id,
                    'date'          => $today,
                    'type'          => 'telat',
                    'poin'          => $poinTelat,
                ]);

                $student->tambahPoin($poinTelat);
            }

            return response()->json([
                'message'         => 'Absensi berhasil: ' . $student->user->name . ' (' . $status . ')',
                'student'         => $student->fresh(),
                'attendance'      => $attendance,
                'already_scanned' => false,
            ]);
        });
    }

    public function processAlpa(Request $request)
    {
        $date = $request->date ?? now()->format('Y-m-d');

        $studentsAlreadyAbsent = Attendance::where('date', $date)->pluck('student_id');
        $alpaStudents = Student::whereNotIn('id', $studentsAlreadyAbsent)->with('user')->get();

        $poinAlpa = (int) Setting::get('poin_alpa', '10');
        $diproses = [];

        DB::transaction(function () use ($alpaStudents, $date, $poinAlpa, &$diproses) {
            foreach ($alpaStudents as $student) {
                $sudahAda = Violation::where('student_id', $student->id)
                    ->where('date', $date)
                    ->where('type', 'alpa')
                    ->exists();

                if ($sudahAda) {
                    continue;
                }

                Violation::create([
                    'student_id'    => $student->id,
                    'attendance_id' => null,
                    'date'          => $date,
                    'type'          => 'alpa',
                    'poin'          => $poinAlpa,
                ]);

                $student->tambahPoin($poinAlpa);
                $diproses[] = $student->user->name;
            }
        });

        return response()->json([
            'message'  => count($diproses) > 0
                ? count($diproses) . ' siswa ditandai alpa untuk tanggal ' . $date . '.'
                : 'Tidak ada siswa yang perlu ditandai alpa (semua sudah absen, atau sudah pernah diproses).',
            'siswa_alpa' => $diproses,
        ]);
    }

    public function report(Request $request)
    {
        $date = $request->date ?? now()->format('Y-m-d');

        if ($request->class_room_id) {
            $students = Student::with('user')
                ->where('class_room_id', $request->class_room_id)
                ->get();

            $attendances = Attendance::with('student.user', 'student.classRoom')
                ->where('date', $date)
                ->where('class_room_id', $request->class_room_id)
                ->get()
                ->keyBy('student_id');

            $hasil = $students->map(function ($student) use ($attendances, $date) {
                $attendance = $attendances->get($student->id);

                if ($attendance) {
                    return [
                        'id'      => $attendance->id,
                        'student' => $student,
                        'date'    => $date,
                        'time_in' => $attendance->time_in,
                        'status'  => $attendance->status,
                    ];
                }

                return [
                    'id'      => 'alpa-' . $student->id,
                    'student' => $student,
                    'date'    => $date,
                    'time_in' => null,
                    'status'  => 'alpa',
                ];
            });

            return $hasil->sortBy([
                fn ($a, $b) => ($a['status'] === 'alpa') <=> ($b['status'] === 'alpa'),
                fn ($a, $b) => $a['student']->user->name <=> $b['student']->user->name,
            ])->values();
        }

        $query = Attendance::with('student.user', 'student.classRoom')->where('date', $date);

        return $query->orderByDesc('time_in')->get();
    }

    public function violationReport(Request $request)
    {
        $query = Student::with(['user', 'classRoom'])
            ->withCount(['violations as telat_count' => fn ($q) => $q->where('type', 'telat')])
            ->withCount(['violations as alpa_count' => fn ($q) => $q->where('type', 'alpa')]);

        if ($request->class_room_id) {
            $query->where('class_room_id', $request->class_room_id);
        }

        return $query->orderByDesc('total_poin')->get();
    }

    public function violationDetail(Request $request)
    {
        $query = Violation::with('student.user', 'student.classRoom');

        if ($request->date) {
            $query->where('date', $request->date);
        }
        if ($request->class_room_id) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $request->class_room_id));
        }

        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }
}
