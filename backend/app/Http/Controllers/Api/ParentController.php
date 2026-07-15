<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\Attendance;
use App\Models\Student;
use App\Models\Violation;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    /**
     * Daftar anak-anak dari akun wali yang login, lengkap dengan kelas
     * dan ringkasan poin (buat ditampilkan di pemilih anak / kartu ringkasan).
     */
    public function children(Request $request)
    {
        $children = $request->user()->children()->with(['user', 'classRoom'])->get();
        return response()->json($children);
    }

    /**
     * Aktivitas terkini 1 anak: gabungan absensi, poin pelanggaran, dan poin
     * prestasi dalam satu linimasa, diurutkan dari yang terbaru.
     * Selalu dicek dulu bahwa $studentId ini benar anak dari wali yang login.
     */
    public function activity(Request $request, $studentId)
    {
        $isMyChild = $request->user()->children()->where('students.id', $studentId)->exists();

        if (!$isMyChild) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
        }

        $student = Student::with(['user', 'classRoom'])->findOrFail($studentId);

        $attendances = Attendance::where('student_id', $studentId)
            ->orderByDesc('date')->limit(15)->get()
            ->map(fn ($a) => [
                'type'   => 'absensi',
                'date'   => $a->date,
                'title'  => 'Absensi: ' . ucfirst($a->status),
                'detail' => $a->time_in ? ('Jam masuk ' . $a->time_in) : null,
                'status' => $a->status,
                'poin'   => null,
            ]);

        $violations = Violation::with('violationType')->where('student_id', $studentId)
            ->orderByDesc('date')->limit(15)->get()
            ->map(fn ($v) => [
                'type'   => 'pelanggaran',
                'date'   => $v->date,
                'title'  => $v->violationType?->name ?? 'Pelanggaran',
                'detail' => $v->note,
                'status' => null,
                'poin'   => $v->poin,
            ]);

        $achievements = Achievement::with('achievementType')->where('student_id', $studentId)
            ->orderByDesc('date')->limit(15)->get()
            ->map(fn ($a) => [
                'type'   => 'prestasi',
                'date'   => $a->date,
                'title'  => $a->achievementType?->name ?? 'Prestasi',
                'detail' => $a->note,
                'status' => null,
                'poin'   => $a->poin,
            ]);

        $timeline = $attendances->concat($violations)->concat($achievements)
            ->sortByDesc('date')->values()->take(20);

        return response()->json([
            'student'  => $student,
            'timeline' => $timeline,
        ]);
    }
}
