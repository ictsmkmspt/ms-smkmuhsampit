<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StudentSelfController extends Controller
{
    public function profile(Request $request)
    {
        $student = $request->user()->student()->with('classRoom')->first();
        return response()->json($student);
    }

    /**
     * Siswa/alumni melengkapi biodata sendiri (bagian fitur BKK) — cuma
     * field yang dicek Student::getBiodataLengkapAttribute() + beberapa
     * pelengkap opsional (pengalaman_kerja). Data resmi Buku Induk lain
     * (kelas, jurusan, NIS, data ortu, dst) tetap dikelola admin/TU lewat
     * EditBiodataSiswaPage.jsx, TIDAK bisa diubah sendiri di sini.
     */
    public function updateBiodata(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        $data = $request->validate([
            'nik'               => 'nullable|string|max:30',
            'tempat_lahir'      => 'nullable|string|max:100',
            'tanggal_lahir'     => 'nullable|date',
            'alamat'            => 'nullable|string|max:255',
            'no_telp'           => 'nullable|string|max:30',
            'agama'             => 'nullable|string|max:50',
            'tinggi_badan'      => 'nullable|integer|min:50|max:250',
            'berat_badan'       => 'nullable|integer|min:20|max:300',
            'status_pernikahan' => 'nullable|in:belum_menikah,menikah',
            // Daftar keahlian, BUKAN 1 blok teks — alumni tambah satu-satu
            // lewat BiodataTab.jsx (chip input), dikirim sebagai array.
            'keahlian'          => 'nullable|array',
            'keahlian.*'        => 'string|max:100',
            'pengalaman_kerja'  => 'nullable|string|max:2000',
        ]);

        $student->update($data);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    public function uploadMyFoto(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        $request->validate(['foto' => 'required|image|max:2048']);

        if ($student->foto) {
            Storage::disk('public')->delete($student->foto);
        }
        $student->update(['foto' => $request->file('foto')->store('siswa-foto', 'public')]);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    public function uploadMyKtp(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        $request->validate(['ktp' => 'required|file|mimes:pdf,jpg,jpeg,png|max:2048']);

        if ($student->ktp) {
            Storage::disk('public')->delete($student->ktp);
        }
        $student->update(['ktp' => $request->file('ktp')->store('siswa-ktp', 'public')]);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    public function deleteMyKtp(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        if ($student->ktp) {
            Storage::disk('public')->delete($student->ktp);
        }
        $student->update(['ktp' => null]);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    public function uploadMyCv(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        $request->validate(['cv' => 'required|file|mimes:pdf|max:2048']);

        if ($student->cv) {
            Storage::disk('public')->delete($student->cv);
        }
        $student->update(['cv' => $request->file('cv')->store('siswa-cv', 'public')]);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    public function deleteMyCv(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        if ($student->cv) {
            Storage::disk('public')->delete($student->cv);
        }
        $student->update(['cv' => null]);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    /**
     * Tambah 1 sertifikat — MENAMBAH ke daftar yang sudah ada (bukan
     * menimpa), supaya alumni bisa unggah beberapa sertifikat satu-satu.
     * Tiap item diberi "id" acak supaya bisa dihapus per item lewat
     * deleteMySertifikat() tanpa terganggu pergeseran index array.
     */
    public function uploadMySertifikat(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        $data = $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:2048',
            'nama' => 'required|string|max:150',
        ]);

        $daftar = $student->sertifikat ?? [];
        $daftar[] = [
            'id'   => Str::random(10),
            'nama' => $data['nama'],
            'file' => $request->file('file')->store('siswa-sertifikat', 'public'),
        ];
        $student->update(['sertifikat' => $daftar]);

        return $student->fresh(['classRoom', 'jurusan']);
    }

    public function deleteMySertifikat(Request $request, string $sertifikatId)
    {
        $student = $request->user()->student;
        abort_unless($student, 404);

        $daftar = collect($student->sertifikat ?? []);
        $item = $daftar->firstWhere('id', $sertifikatId);
        abort_unless($item, 404, 'Sertifikat tidak ditemukan.');

        Storage::disk('public')->delete($item['file']);
        $student->update(['sertifikat' => $daftar->reject(fn ($s) => $s['id'] === $sertifikatId)->values()->all()]);

        return $student->fresh(['classRoom', 'jurusan']);
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
