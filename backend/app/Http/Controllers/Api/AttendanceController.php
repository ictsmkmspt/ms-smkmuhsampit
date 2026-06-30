<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\Student;
use Illuminate\Http\Request;
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
                'message'        => $student->user->name . ' sudah absen hari ini pukul ' . $existing->time_in,
                'student'        => $student,
                'already_scanned'=> true,
            ]);
        }

        $status = $jamSekarang > $jamBatas ? 'telat' : 'hadir';

        $attendance = Attendance::create([
            'student_id'    => $student->id,
            'class_room_id' => $student->class_room_id,
            'date'          => $today,
            'time_in'       => $jamSekarang,
            'status'        => $status,
            'scanned_by'    => $request->user()->id,
        ]);

        return response()->json([
            'message'        => 'Absensi berhasil: ' . $student->user->name . ' (' . $status . ')',
            'student'        => $student,
            'attendance'     => $attendance,
            'already_scanned'=> false,
        ]);
    }

    public function report(Request $request)
    {
        $query = Attendance::with('student.user', 'student.classRoom');

        if ($request->date) {
            $query->where('date', $request->date);
        }
        if ($request->class_room_id) {
            $query->where('class_room_id', $request->class_room_id);
        }

        return $query->orderByDesc('date')->orderByDesc('time_in')->get();
    }
}
