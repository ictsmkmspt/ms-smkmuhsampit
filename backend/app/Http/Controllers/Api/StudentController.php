<?php

namespace App\Http\Controllers\Api;

use App\Exports\StudentTemplateExport;
use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Imports\StudentsImport;
use App\Models\Achievement;
use App\Models\Student;
use App\Models\User;
use App\Models\Violation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class StudentController extends Controller
{
    use ResetsPasswordToDefault;

    /**
     * Default cuma siswa aktif (dipakai hampir semua fitur: absensi, dropdown,
     * daftar Master Data > Siswa, dst). Kirim ?status=lulus untuk menu Alumni,
     * atau ?status=semua kalau perlu keduanya sekaligus.
     * Diurutkan kelas dulu (abjad), baru nama siswa (abjad) — sama seperti
     * pola di AttendanceController::todayStatus()/report() — supaya daftar
     * lintas kelas rapi, bukan ikut urutan id/input.
     */
    public function index(Request $request)
    {
        $query = Student::with(['user', 'classRoom']);
        $status = $request->query('status', 'aktif');
        if ($status !== 'semua') {
            $query->where('students.status', $status);
        }
        if ($request->class_room_id) {
            $query->where('students.class_room_id', $request->class_room_id);
        }
        return $query
            ->join('users', 'users.id', '=', 'students.user_id')
            ->leftJoin('class_rooms', 'class_rooms.id', '=', 'students.class_room_id')
            ->orderBy('class_rooms.name')
            ->orderBy('users.name')
            ->select('students.*')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'nullable|min:6',
            'nis' => 'required|string|unique:students,nis',
            'jenis_kelamin' => 'nullable|in:L,P',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => bcrypt($data['password'] ?? '123456'),
                'role' => 'siswa',
            ]);

            $student = Student::create([
                'user_id' => $user->id,
                'class_room_id' => $data['class_room_id'] ?? null,
                'nis' => $data['nis'],
                'jenis_kelamin' => $data['jenis_kelamin'] ?? null,
                'barcode_code' => 'STD-' . strtoupper(Str::random(8)),
            ]);

            return $student->load(['user', 'classRoom']);
        });
    }

    public function update(Request $request, Student $student)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $student->user_id,
            'nis' => 'sometimes|string|unique:students,nis,' . $student->id,
            'jenis_kelamin' => 'nullable|in:L,P',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        if (isset($data['name']) || isset($data['email'])) {
            $student->user->update(array_intersect_key($data, array_flip(['name', 'email'])));
        }
        $student->update($request->only('nis', 'class_room_id', 'jenis_kelamin'));

        return $student->load(['user', 'classRoom']);
    }

    public function destroy(Student $student)
    {
        // peminjam_id di perpustakaan_peminjaman TIDAK punya FK (relasi
        // polimorfik, bisa Student ATAU Teacher) — kalau siswa yang masih
        // pinjam buku dihapus, baris peminjamannya jadi yatim & eksemplar
        // terkunci "dipinjam" selamanya karena tidak ada yang bisa
        // memprosesnya lewat menu Kembali. Dicegah di sini.
        if ($student->peminjamanPerpustakaan()->where('status', 'dipinjam')->exists()) {
            return response()->json(['message' => 'Siswa ini masih meminjam buku perpustakaan — proses pengembaliannya dulu sebelum menghapus akun.'], 422);
        }

        $student->user->delete();
        return response()->json(['message' => 'Siswa dihapus.']);
    }

    public function resetPassword(Student $student)
    {
        $this->resetToDefaultPassword($student->user);
        return response()->json(['message' => 'Password siswa "' . $student->user->name . '" berhasil direset ke default (123456).']);
    }

    /**
     * KHUSUS BANTU PENGEMBANGAN/TESTING — hapus TOTAL seluruh riwayat
     * Violation & Achievement (semua siswa, termasuk alumni), lalu reset
     * total_poin/total_prestasi semua siswa ke 0. BEDA dari
     * TahunAjaranController::aktifkan() yang cuma menghitung ulang total
     * tanpa menghapus riwayat apa pun — endpoint ini betul-betul
     * menghapus data, sengaja TIDAK dipakai di alur operasional sekolah.
     */
    public function resetPoin()
    {
        DB::transaction(function () {
            Violation::query()->delete();
            Achievement::query()->delete();
            Student::query()->update(['total_poin' => 0, 'total_prestasi' => 0]);
        });

        return response()->json([
            'message' => 'Seluruh riwayat pelanggaran & prestasi dihapus, dan total poin semua siswa direset ke 0.',
        ]);
    }

    /**
     * Batalkan status lulus — dipakai kalau ada siswa yang salah ikut
     * diluluskan. Riwayat SPP dkk tidak berubah, cuma status siswanya balik
     * jadi aktif lagi.
     */
    public function kembalikanAktif(Student $student)
    {
        $student->update(['status' => 'aktif', 'tanggal_lulus' => null]);

        return $student->load(['user', 'classRoom']);
    }

    /**
     * Cari siswa berdasarkan barcode_code, TANPA mencatat absensi.
     * Dipakai oleh fitur scan QR di halaman Poin Pelanggaran (guru).
     */
    public function findByBarcode(string $code)
    {
        $student = Student::with(['user', 'classRoom'])->where('barcode_code', $code)->first();

        if (!$student) {
            return response()->json([
                'message' => 'QR Code tidak dikenali / siswa tidak ditemukan.',
            ], 404);
        }

        return response()->json($student);
    }

    /**
     * Download file Excel (.xlsx) kosong berisi contoh format kolom untuk import data siswa.
     * Isi datanya, lalu upload lewat fitur Import.
     */
    public function downloadTemplate()
    {
        return Excel::download(new StudentTemplateExport, 'template_import_siswa.xlsx');
    }

    /**
     * Import banyak siswa sekaligus dari file Excel (.xlsx) yang diupload.
     * Format kolom harus sesuai template (nama, email, nis, jenis_kelamin, kelas). Kolom
     * "password" opsional — kalau ditambahkan manual & diisi, dipakai; kalau tidak ada / kosong,
     * password default "123456" (wajib diganti siswa saat login pertama).
     * Baris yang gagal tidak menghentikan proses, cukup dilaporkan di akhir.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $import = new StudentsImport;
        Excel::import($import, $request->file('file'));

        $gagal = [];
        foreach ($import->failures() as $failure) {
            $gagal[] = [
                'baris'  => $failure->row(),
                'kolom'  => $failure->attribute(),
                'alasan' => implode(' ', $failure->errors()),
            ];
        }

        return response()->json([
            'message'  => $import->successCount . ' siswa berhasil diimport, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal'    => $gagal,
        ]);
    }
}
