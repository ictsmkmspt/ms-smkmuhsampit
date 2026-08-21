<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\HitungSkorCbt;
use App\Http\Controllers\Controller;
use App\Models\CbtExam;
use App\Models\CbtExamAttempt;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

/**
 * Portal Pengawas Ujian — beda dari CbtExamController (dipakai guru, semua
 * method-nya dibatasi ownTeacherId), controller ini SENGAJA tidak
 * membatasi ke 1 guru manapun: pengawas boleh memantau SEMUA ujian &
 * latihan yang sedang berlangsung (status 'terbuka') di seluruh sekolah,
 * lintas guru/mapel/kelas. Cuma dibatasi ke ujian yang tahun ajarannya
 * aktif & yang statusnya 'terbuka' — begitu ujian ditutup guru, tidak lagi
 * relevan buat diawasi live.
 *
 * Fungsinya sengaja dibatasi ke kontrol darurat saja (Hentikan sesi
 * mencurigakan/macet, Tambah Waktu kalau ada gangguan) — TIDAK bisa Reset
 * (yang menghapus jawaban) atau Koreksi Essay, itu tetap wewenang guru
 * pemilik ujian lewat menu Laporan.
 */
class CbtPengawasController extends Controller
{
    use HitungSkorCbt;

    public function ujianAktif()
    {
        return CbtExam::where('status', 'terbuka')
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with(['subject', 'classRooms', 'teacher.user'])
            ->withCount(['examQuestions', 'attempts'])
            ->orderByDesc('id')
            ->get();
    }

    public function attempts(CbtExam $cbtExam)
    {
        if ($cbtExam->status !== 'terbuka') {
            return response()->json(['message' => 'Ujian ini sudah tidak berlangsung.'], 422);
        }

        $attempts = $cbtExam->attempts()->with('student.user')->withCount('answers')->orderByDesc('skor')->get();

        return response()->json([
            'total_soal' => $cbtExam->examQuestions()->count(),
            'attempts' => $attempts,
        ]);
    }

    public function hentikanAttempt(CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->exam->status !== 'terbuka') {
            return response()->json(['message' => 'Ujian ini sudah tidak berlangsung.'], 422);
        }
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Sesi ini sudah selesai.'], 422);
        }

        $this->finalisasiAttempt($cbtExamAttempt);

        return $cbtExamAttempt->fresh();
    }

    public function tambahWaktu(Request $request, CbtExamAttempt $cbtExamAttempt)
    {
        if ($cbtExamAttempt->exam->status !== 'terbuka') {
            return response()->json(['message' => 'Ujian ini sudah tidak berlangsung.'], 422);
        }
        if ($cbtExamAttempt->status !== 'in_progress') {
            return response()->json(['message' => 'Cuma sesi yang sedang berjalan yang bisa ditambah waktunya.'], 422);
        }

        $data = $request->validate([
            'menit' => 'required|integer|min:1|max:180',
        ]);

        $cbtExamAttempt->increment('extra_minutes', $data['menit']);

        return response()->json(['message' => 'Waktu ditambah.', 'extra_minutes' => $cbtExamAttempt->fresh()->extra_minutes]);
    }
}
