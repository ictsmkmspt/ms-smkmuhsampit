<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\AchievementType;
use App\Models\PrayerAttendance;
use App\Models\Student;
use App\Models\Violation;
use App\Models\ViolationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrayerAttendanceController extends Controller
{
    /**
     * Rekap sholat Zuhur 1 kelas di 1 tanggal. Siswa yang belum diabsen
     * statusnya dibiarkan NULL (bukan otomatis "tidak") — supaya guru bisa lihat
     * jelas siapa yang sudah dan belum dicatat.
     */
    public function report(Request $request)
    {
        $request->validate([
            'class_room_id' => 'required|exists:class_rooms,id',
            'date'          => 'nullable|date',
        ]);

        $date = $request->date ?? now()->format('Y-m-d');

        $students = Student::with('user')->where('class_room_id', $request->class_room_id)
            ->join('users', 'users.id', '=', 'students.user_id')
            ->orderBy('users.name')
            ->select('students.*')
            ->get();

        $records = PrayerAttendance::where('date', $date)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()->keyBy('student_id');

        $hasil = $students->map(function ($student) use ($records, $date) {
            $rec = $records->get($student->id);
            return [
                'student' => $student,
                'date'    => $date,
                'status'  => $rec?->status, // null = belum diabsen, dibiarkan kosong
            ];
        });

        return response()->json(['date' => $date, 'students' => $hasil]);
    }

    /**
     * Terapkan status sholat Zuhur untuk 1 siswa di 1 tanggal, sekaligus urus poinnya:
     * - melaksanakan -> +poin prestasi (default 5, "Sholat Zuhur Berjamaah")
     * - berhalangan  -> tidak ada efek poin sama sekali
     * - tidak        -> +poin pelanggaran (default 5, "Tidak Sholat Zuhur")
     * Kalau statusnya diubah-ubah (guru koreksi), efek poin dari status lama dibatalkan dulu.
     */
    private function applyStatus(Student $student, string $date, string $status, ?int $recordedBy): PrayerAttendance
    {
        return DB::transaction(function () use ($student, $date, $status, $recordedBy) {
            $existing  = PrayerAttendance::where('student_id', $student->id)->where('date', $date)->first();
            $oldStatus = $existing?->status;

            if ($oldStatus === $status) {
                return $existing;
            }

            // 1. Batalkan efek poin dari status LAMA (kalau ada).
            if ($oldStatus === 'melaksanakan') {
                $jenis = AchievementType::where('name', 'Sholat Zuhur Berjamaah')->first();
                $old = Achievement::where('student_id', $student->id)->where('date', $date)
                    ->when($jenis, fn ($q) => $q->where('achievement_type_id', $jenis->id))
                    ->first();
                if ($old) {
                    $student->tambahPrestasi(-$old->poin);
                    $old->delete();
                }
            } elseif ($oldStatus === 'tidak') {
                $jenis = ViolationType::where('name', 'Tidak Sholat Zuhur')->first();
                $old = Violation::where('student_id', $student->id)->where('date', $date)
                    ->when($jenis, fn ($q) => $q->where('violation_type_id', $jenis->id))
                    ->first();
                if ($old) {
                    $student->tambahPoin(-$old->poin);
                    $old->delete();
                }
            }

            // 2. Simpan / perbarui catatan sholat.
            if ($existing) {
                $existing->update(['status' => $status, 'recorded_by' => $recordedBy]);
                $record = $existing;
            } else {
                $record = PrayerAttendance::create([
                    'student_id'    => $student->id,
                    'class_room_id' => $student->class_room_id,
                    'date'          => $date,
                    'status'        => $status,
                    'recorded_by'   => $recordedBy,
                ]);
            }

            // 3. Terapkan efek poin dari status BARU.
            if ($status === 'melaksanakan') {
                $jenis = AchievementType::firstOrCreate(
                    ['name' => 'Sholat Zuhur Berjamaah'],
                    ['poin' => 5]
                );
                Achievement::create([
                    'student_id'          => $student->id,
                    'achievement_type_id' => $jenis->id,
                    'date'                => $date,
                    'poin'                => $jenis->poin,
                    'note'                => 'Sholat Zuhur berjamaah',
                    'recorded_by'         => $recordedBy,
                ]);
                $student->tambahPrestasi($jenis->poin);
            } elseif ($status === 'tidak') {
                $jenis = ViolationType::firstOrCreate(
                    ['name' => 'Tidak Sholat Zuhur'],
                    ['poin' => 5]
                );
                Violation::create([
                    'student_id'        => $student->id,
                    'attendance_id'     => null,
                    'violation_type_id' => $jenis->id,
                    'date'              => $date,
                    'type'              => 'manual',
                    'poin'              => $jenis->poin,
                    'note'              => 'Tidak sholat Zuhur berjamaah',
                    'recorded_by'       => $recordedBy,
                ]);
                $student->tambahPoin($jenis->poin);
            }
            // 'berhalangan' -> sengaja tidak ada efek poin apa pun.

            return $record;
        });
    }

    /**
     * Absen manual: pilih status (melaksanakan/berhalangan/tidak) untuk 1 siswa.
     */
    public function manual(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'status'     => 'required|in:melaksanakan,berhalangan,tidak',
            'date'       => 'nullable|date',
        ]);

        $student = Student::with('user')->find($data['student_id']);
        $date    = $data['date'] ?? now()->format('Y-m-d');

        $this->applyStatus($student, $date, $data['status'], $request->user()->id);

        $label = [
            'melaksanakan' => 'Melaksanakan',
            'berhalangan'  => 'Berhalangan',
            'tidak'        => 'Tidak Sholat',
        ][$data['status']];

        return response()->json([
            'message' => 'Sholat Zuhur ' . $student->user->name . ' dicatat: ' . $label . '.',
        ]);
    }

    /**
     * Scan barcode -> langsung dicatat "melaksanakan" (mirip scan absensi kelas).
     */
    public function scan(Request $request)
    {
        $request->validate(['code' => 'required|string']);

        $student = Student::with('user')->where('barcode_code', $request->code)->first();

        if (!$student) {
            return response()->json(['message' => 'Barcode tidak dikenali / siswa tidak ditemukan.'], 404);
        }

        $date     = now()->format('Y-m-d');
        $existing = PrayerAttendance::where('student_id', $student->id)->where('date', $date)->first();

        if ($existing && $existing->status === 'melaksanakan') {
            return response()->json([
                'message'         => $student->user->name . ' sudah tercatat sholat Zuhur hari ini.',
                'already_scanned' => true,
            ]);
        }

        $this->applyStatus($student, $date, 'melaksanakan', $request->user()->id);

        return response()->json([
            'message'         => 'Sholat Zuhur tercatat: ' . $student->user->name,
            'already_scanned' => false,
        ]);
    }
}
