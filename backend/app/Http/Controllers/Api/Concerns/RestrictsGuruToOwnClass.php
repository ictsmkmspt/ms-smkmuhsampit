<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\ClassRoom;
use App\Models\Teacher;
use Illuminate\Http\Request;

trait RestrictsGuruToOwnClass
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
}
