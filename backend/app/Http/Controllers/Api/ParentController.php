<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\AcademicScore;
use App\Models\Attendance;
use App\Models\Spp;
use App\Models\Student;
use App\Models\TagihanLain;
use App\Models\TahunAjaran;
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

        $academicScores = AcademicScore::with('subject')->where('student_id', $studentId)
            ->orderByDesc('tanggal')->limit(15)->get()
            ->map(fn ($n) => [
                'type'   => 'nilai',
                'date'   => $n->tanggal,
                'title'  => $n->nama_kegiatan,
                'detail' => $n->subject?->nama,
                'status' => null,
                'poin'   => $n->skor,
            ]);

        $timeline = $attendances->concat($violations)->concat($achievements)->concat($academicScores)
            ->sortByDesc('date')->values()->take(20);

        return response()->json([
            'student'  => $student,
            'timeline' => $timeline,
        ]);
    }

    /**
     * Riwayat nilai akademik 1 anak (semua mapel), dari yang terbaru —
     * dipakai tab "Nilai" dashboard Wali (terpisah dari linimasa Aktivitas
     * Terkini di Beranda yang cuma menampilkan 15 nilai terbaru tercampur
     * dengan absensi/pelanggaran/prestasi).
     */
    public function academicScores(Request $request, $studentId)
    {
        $isMyChild = $request->user()->children()->where('students.id', $studentId)->exists();

        if (!$isMyChild) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
        }

        return AcademicScore::with('subject', 'recordedBy')
            ->where('student_id', $studentId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('tanggal')
            ->get();
    }

    /**
     * Riwayat SPP 1 anak, dari bulan terbaru. Selalu dicek dulu bahwa
     * $studentId ini benar anak dari wali yang login.
     */
    public function spp(Request $request, $studentId)
    {
        $isMyChild = $request->user()->children()->where('students.id', $studentId)->exists();

        if (!$isMyChild) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
        }

        return Spp::where('student_id', $studentId)
            ->orderByDesc('tahun')->orderByDesc('bulan')
            ->get();
    }

    /**
     * Riwayat Tagihan Lain (biaya di luar SPP) 1 anak. Selalu dicek dulu
     * bahwa $studentId ini benar anak dari wali yang login.
     */
    public function tagihanLain(Request $request, $studentId)
    {
        $isMyChild = $request->user()->children()->where('students.id', $studentId)->exists();

        if (!$isMyChild) {
            return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
        }

        return TagihanLain::where('student_id', $studentId)
            ->orderByDesc('created_at')
            ->get();
    }
}
