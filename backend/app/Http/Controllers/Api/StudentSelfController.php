<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StudentSelfController extends Controller
{
    public function profile(Request $request)
    {
        $student = $request->user()->student()->with('classRoom')->first();
        return response()->json($student);
    }

    public function attendances(Request $request)
    {
        $student = $request->user()->student;
        $data = $student->attendances()->orderByDesc('date')->limit(30)->get();
        return response()->json($data);
    }

    /**
     * Riwayat pelanggaran milik siswa yang sedang login — dipakai halaman
     * "Riwayat Poin" siswa. total_poin diambil langsung dari data siswa
     * (sudah terakumulasi), tidak perlu dihitung ulang dari riwayat.
     */
    public function violations(Request $request)
    {
        $student = $request->user()->student;
        $data = $student->violations()->with('violationType')->orderByDesc('date')->get();
        return response()->json($data);
    }

    /**
     * Riwayat prestasi milik siswa yang sedang login.
     */
    public function achievements(Request $request)
    {
        $student = $request->user()->student;
        $data = $student->achievements()->with('achievementType')->orderByDesc('date')->get();
        return response()->json($data);
    }
}
