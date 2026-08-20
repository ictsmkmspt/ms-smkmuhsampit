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
use Illuminate\Support\Facades\Storage;
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
        $query = Student::with(['user', 'classRoom', 'jurusan']);
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
            'nisn' => 'nullable|string|unique:students,nisn',
            'jenis_kelamin' => 'nullable|in:L,P',
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'jurusan_id' => 'nullable|exists:jurusans,id',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'alamat' => 'nullable|string|max:300',
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
                'jurusan_id' => $data['jurusan_id'] ?? null,
                'nis' => $data['nis'],
                'nisn' => $data['nisn'] ?? null,
                'jenis_kelamin' => $data['jenis_kelamin'] ?? null,
                'tempat_lahir' => $data['tempat_lahir'] ?? null,
                'tanggal_lahir' => $data['tanggal_lahir'] ?? null,
                'alamat' => $data['alamat'] ?? null,
                'qr_code' => 'STD-' . strtoupper(Str::random(8)),
            ]);

            return $student->load(['user', 'classRoom', 'jurusan']);
        });
    }

    /**
     * Detail lengkap 1 siswa — dipakai halaman "Buku Induk" (menu baru,
     * bukan modal, lihat PrintBukuInduk.jsx) yang menampilkan biodata
     * lengkap + wali/orang tua yang terhubung.
     */
    public function show(Student $student)
    {
        return $student->load(['user', 'classRoom', 'jurusan', 'parents']);
    }

    public function update(Request $request, Student $student)
    {
        $data = $request->validate([
            // name/email/nis/jenis_kelamin/agama/tempat_lahir/tanggal_lahir/
            // alamat/class_room_id/jurusan_id WAJIB diisi — ini form
            // biodata lengkap (EditBiodataSiswaPage.jsx), bukan tambah
            // siswa cepat (store() di bawah TETAP nullable buat field
            // biodata yang belum tentu diketahui saat pendaftaran awal).
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email,' . $student->user_id,
            'nis' => 'required|string|unique:students,nis,' . $student->id,
            'nisn' => 'nullable|string|unique:students,nisn,' . $student->id,
            'nik' => 'nullable|string|max:20',
            'jenis_kelamin' => 'required|in:L,P',
            'agama' => 'required|string|max:30',
            'class_room_id' => 'required|exists:class_rooms,id',
            'jurusan_id' => 'required|exists:jurusans,id',
            'tempat_lahir' => 'required|string|max:100',
            'tanggal_lahir' => 'required|date',
            'alamat' => 'required|string|max:300',
            'kebutuhan_khusus' => 'nullable|string|max:255',
            'jumlah_saudara' => 'nullable|integer|min:0|max:99',
            'anak_ke' => 'nullable|integer|min:0|max:99',
            'no_telp' => 'nullable|string|max:30',
            // Sekolah asal & ijazah/STTB
            'sekolah_asal_nama' => 'nullable|string|max:255',
            'sekolah_asal_alamat' => 'nullable|string|max:255',
            'ijazah_tahun' => 'nullable|string|max:20',
            'ijazah_nomor' => 'nullable|string|max:100',
            // Penerimaan di sekolah ini
            'tingkat_diterima' => 'nullable|string|max:10',
            'tanggal_diterima' => 'nullable|date',
            // Orang tua
            'nama_ayah' => 'nullable|string|max:255',
            'nama_ibu' => 'nullable|string|max:255',
            'alamat_ortu' => 'nullable|string|max:300',
            'telp_ortu' => 'nullable|string|max:60',
            'pekerjaan_ortu' => 'nullable|string|max:255',
            'penghasilan_ortu' => 'nullable|string|max:60',
            // Wali
            'nama_wali' => 'nullable|string|max:255',
            'alamat_wali' => 'nullable|string|max:300',
            'telp_wali' => 'nullable|string|max:60',
            'pekerjaan_wali' => 'nullable|string|max:255',
        ]);

        if (isset($data['name']) || isset($data['email'])) {
            $student->user->update(array_intersect_key($data, array_flip(['name', 'email'])));
        }
        $student->update($request->only([
            'nis', 'nisn', 'nik', 'class_room_id', 'jenis_kelamin', 'agama', 'jurusan_id',
            'tempat_lahir', 'tanggal_lahir', 'alamat', 'kebutuhan_khusus', 'jumlah_saudara', 'anak_ke', 'no_telp',
            'sekolah_asal_nama', 'sekolah_asal_alamat', 'ijazah_tahun', 'ijazah_nomor',
            'tingkat_diterima', 'tanggal_diterima',
            'nama_ayah', 'nama_ibu', 'alamat_ortu', 'telp_ortu', 'pekerjaan_ortu', 'penghasilan_ortu',
            'nama_wali', 'alamat_wali', 'telp_wali', 'pekerjaan_wali',
        ]));

        return $student->load(['user', 'classRoom', 'jurusan']);
    }

    /**
     * Foto siswa diunggah terpisah dari store()/update() (butuh multipart,
     * bukan JSON) — pola sama BukuController::uploadCover().
     */
    public function uploadFoto(Request $request, Student $student)
    {
        $request->validate(['foto' => 'required|image|max:2048']);

        if ($student->foto) {
            Storage::disk('public')->delete($student->foto);
        }
        $student->update(['foto' => $request->file('foto')->store('siswa-foto', 'public')]);

        return $student->fresh(['user', 'classRoom', 'jurusan']);
    }

    /**
     * Upload BANYAK foto sekaligus — nama file (tanpa ekstensi) dicocokkan
     * ke NIS siswa, mis. "40263136.jpg" otomatis jadi foto siswa dengan
     * NIS itu. Per file divalidasi manual (bukan lewat $request->validate)
     * supaya 1 file bermasalah (bukan gambar, NIS tidak ketemu, dst) cuma
     * masuk daftar "gagal" — tidak menggagalkan seluruh batch, pola sama
     * seperti StudentsImport::failures().
     */
    public function uploadFotoMassal(Request $request)
    {
        $request->validate(['files' => 'required|array|min:1']);

        $extensiDiizinkan = ['jpg', 'jpeg', 'png', 'webp'];
        $berhasil = 0;
        $gagal = [];

        foreach ($request->file('files', []) as $file) {
            $namaAsli = $file->getClientOriginalName();
            $nis = trim(pathinfo($namaAsli, PATHINFO_FILENAME));
            $ekstensi = strtolower($file->getClientOriginalExtension());

            if (!in_array($ekstensi, $extensiDiizinkan)) {
                $gagal[] = ['file' => $namaAsli, 'alasan' => 'Bukan file gambar (jpg/png/webp).'];
                continue;
            }
            if ($file->getSize() > 2048 * 1024) {
                $gagal[] = ['file' => $namaAsli, 'alasan' => 'Ukuran file lebih dari 2MB.'];
                continue;
            }

            $student = Student::where('nis', $nis)->first();
            if (!$student) {
                $gagal[] = ['file' => $namaAsli, 'alasan' => "NIS \"{$nis}\" tidak ditemukan."];
                continue;
            }

            if ($student->foto) {
                Storage::disk('public')->delete($student->foto);
            }
            $student->update(['foto' => $file->store('siswa-foto', 'public')]);
            $berhasil++;
        }

        return response()->json([
            'message' => "{$berhasil} foto berhasil diunggah" . (count($gagal) ? ', ' . count($gagal) . ' gagal.' : '.'),
            'berhasil' => $berhasil,
            'gagal' => $gagal,
        ]);
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
     * Cari siswa berdasarkan qr_code, TANPA mencatat absensi.
     * Dipakai oleh fitur scan QR di halaman Poin Pelanggaran (guru).
     */
    public function findByQrCode(string $code)
    {
        $student = Student::with(['user', 'classRoom'])->where('qr_code', $code)->first();

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
