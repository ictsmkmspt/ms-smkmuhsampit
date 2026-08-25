<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;

/**
 * Bantuan "cari NIS" untuk alumni — publik, TIDAK butuh login. Alumni
 * sering lupa NIS-nya padahal login BKK (/bursakerjakhusus/masuk) butuh
 * NIS (lihat AuthController::loginNis()). Nama lengkap + tanggal lahir
 * saja relatif gampang ditebak orang lain, jadi ditambah 1 pengaman lagi
 * (NISN, sudah unique per siswa) sebelum NIS asli ditampilkan.
 */
class AlumniLookupController extends Controller
{
    public function cariNis(Request $request)
    {
        $data = $request->validate([
            'nama_lengkap'  => 'required|string|max:150',
            'tanggal_lahir' => 'required|date',
            'nisn'          => 'required|string|max:20',
        ]);

        $student = Student::where('nisn', trim($data['nisn']))
            ->where('status', 'lulus')
            ->whereDate('tanggal_lahir', $data['tanggal_lahir'])
            ->with('user')
            ->first();

        $namaCocok = $student?->user
            && strtolower(trim($student->user->name)) === strtolower(trim($data['nama_lengkap']));

        abort_unless($namaCocok, 404, 'Data tidak ditemukan. Pastikan nama lengkap, tanggal lahir, dan NISN sesuai data sekolah.');

        return response()->json(['nis' => $student->nis]);
    }
}
