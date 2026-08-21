<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CbtExam;
use App\Models\CbtExamAuditLog;
use App\Models\CbtTujuanPembelajaran;
use App\Models\TahunAjaran;

/**
 * Menu "Monitoring CBT" Admin/Waka Kurikulum — baca-saja, lintas guru.
 * Semua controller CBT lain (CbtTpController, CbtMateriController,
 * CbtExamController) SENGAJA dibatasi ownTeacherId per guru; controller
 * ini justru kebalikannya, dipakai untuk melihat TP & Ujian/Latihan semua
 * guru sekaligus supaya kurikulum bisa memantau kelengkapan materi &
 * aktivitas ujian tanpa perlu login sebagai tiap guru satu-satu.
 */
class CbtMonitoringController extends Controller
{
    public function tp()
    {
        return CbtTujuanPembelajaran::where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with(['teacher.user', 'subject'])
            ->withCount('materiList')
            ->orderBy('subject_id')
            ->orderBy('urutan')
            ->get();
    }

    public function ujian()
    {
        return CbtExam::where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->with(['teacher.user', 'subject', 'classRooms'])
            ->withCount(['examQuestions', 'attempts'])
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Jejak audit Edit/Hapus/Buka Kembali pada ujian yang SUDAH ADA siswa
     * mengerjakan — lihat LogsCbtExamAudit. Ditampilkan 100 terbaru saja,
     * cukup buat pengawasan, bukan laporan historis penuh.
     */
    public function auditLog()
    {
        return CbtExamAuditLog::orderByDesc('created_at')->limit(100)->get();
    }
}
