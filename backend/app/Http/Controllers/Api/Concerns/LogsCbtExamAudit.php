<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\CbtExam;
use App\Models\CbtExamAuditLog;
use Illuminate\Http\Request;

/**
 * Dipakai CbtExamController & AdminCbtExamController — cuma mencatat kalau
 * ujiannya SUDAH ADA siswa yang mengerjakan saat aksi ini dilakukan (Edit/
 * Hapus/Buka Kembali pada ujian yang belum pernah dikerjakan tidak perlu
 * jejak, risikonya nihil). Dipanggil SEBELUM aksi sungguhan dijalankan
 * kalau aksinya "dihapus" (supaya count attempt masih akurat sebelum ikut
 * ter-cascade-delete).
 */
trait LogsCbtExamAudit
{
    private function catatAuditUjian(Request $request, CbtExam $cbtExam, string $aksi): void
    {
        $attemptsCount = $cbtExam->attempts()->count();
        if ($attemptsCount === 0) {
            return;
        }

        $user = $request->user();

        CbtExamAuditLog::create([
            'exam_id' => $cbtExam->id,
            'nama_ujian' => $cbtExam->nama,
            'aksi' => $aksi,
            'user_id' => $user->id,
            'actor_nama' => $user->name,
            'actor_role' => $user->role,
            'attempts_count_saat_itu' => $attemptsCount,
        ]);
    }
}
