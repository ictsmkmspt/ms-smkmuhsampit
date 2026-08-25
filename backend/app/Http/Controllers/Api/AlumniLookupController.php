<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jurusan;
use App\Models\Student;
use Illuminate\Http\Request;

/**
 * Bantuan "cari NIS" untuk alumni yang LUPA NIS-nya — publik, TIDAK
 * butuh login. Alumni isi nama lengkap, jurusan, dan tahun lulus (data
 * yang biasanya masih diingat), sistem balas NIS-nya kalau cocok.
 * Cuma cari lewat 3 field ini (bukan nisn+tanggal_lahir) karena alumni
 * yang diimport lewat Excel (AlumniImport) cuma punya
 * nama/nis/jurusan/tanggal_lulus — kolom nisn/tanggal_lahir tidak
 * selalu terisi.
 */
class AlumniLookupController extends Controller
{
    public function cariNis(Request $request)
    {
        $data = $request->validate([
            'nama'        => 'required|string|max:150',
            'jurusan'     => 'required|string|max:100',
            'tahun_lulus' => 'required|digits:4',
        ]);

        $jurusanTrim = trim($data['jurusan']);
        $jurusan = Jurusan::where('kode', $jurusanTrim)->orWhere('nama', $jurusanTrim)->first();
        abort_unless($jurusan, 404, 'Data tidak ditemukan. Pastikan nama, jurusan, dan tahun lulus sesuai data sekolah.');

        $namaTrim = strtolower(trim($data['nama']));
        $student = Student::where('status', 'lulus')
            ->where('jurusan_id', $jurusan->id)
            ->whereYear('tanggal_lulus', $data['tahun_lulus'])
            ->with('user')
            ->get()
            ->first(fn ($s) => $s->user && strtolower(trim($s->user->name)) === $namaTrim);

        abort_unless($student, 404, 'Data tidak ditemukan. Pastikan nama, jurusan, dan tahun lulus sesuai data sekolah.');

        return response()->json(['nis' => $student->nis]);
    }
}
