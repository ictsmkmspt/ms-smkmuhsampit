<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklPlacement;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class PklPlacementController extends Controller
{
    /**
     * Semua penempatan PKL (admin), dengan filter opsional by status &
     * IDUKA (dudi_id) — dudi_id dipakai Laporan PKL > Kegiatan Siswa untuk
     * menyortir per penempatan IDUKA. `penilaian` diikutkan biar Laporan
     * bisa langsung tampilkan nilai_akhir tanpa request tambahan.
     * Diurutkan nama IDUKA dulu (abjad), baru nama siswa (abjad) — supaya
     * siswa yang 1 tempat PKL langsung terlihat mengelompok, sama seperti
     * pola join+orderBy di StudentController::index().
     * Default cuma tahun ajaran yang sedang aktif — kirim ?tahun_ajaran_id= untuk lihat
     * tahun ajaran lain, atau ?semua_tahun=1 untuk lihat semua tahun ajaran sekaligus.
     */
    public function index(Request $request)
    {
        $query = PklPlacement::with(['student.user', 'student.classRoom', 'dudi', 'guruPembimbing.user', 'penilaian']);
        if ($request->status) {
            $query->where('pkl_placements.status', $request->status);
        }
        if ($request->dudi_id) {
            $query->where('pkl_placements.dudi_id', $request->dudi_id);
        }
        if (!$request->boolean('semua_tahun')) {
            $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
            $query->where('pkl_placements.tahun_ajaran_id', $tahunAjaranId);
        }
        return $query
            ->join('dudis', 'dudis.id', '=', 'pkl_placements.dudi_id')
            ->join('students', 'students.id', '=', 'pkl_placements.student_id')
            ->join('users', 'users.id', '=', 'students.user_id')
            ->orderBy('dudis.nama_perusahaan')
            ->orderBy('users.name')
            ->select('pkl_placements.*')
            ->get();
    }

    /**
     * Daftar guru yang SEDANG ditugaskan sebagai pembimbing PKL (unik, cuma
     * guru yang punya minimal 1 penempatan sebagai guru_pembimbing) — dipakai
     * dropdown filter Laporan PKL > Monitoring Guru, supaya langsung berisi
     * guru yang relevan, bukan semua guru sekolah. Default cuma tahun ajaran
     * aktif, sama seperti index().
     */
    public function guruPembimbing(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $teacherIds = PklPlacement::where('tahun_ajaran_id', $tahunAjaranId)
            ->whereNotNull('guru_pembimbing_id')
            ->distinct()
            ->pluck('guru_pembimbing_id');

        return Teacher::with('user')->whereIn('id', $teacherIds)->get()
            ->sortBy(fn ($t) => $t->user?->name)
            ->values();
    }

    /**
     * Detail 1 penempatan PKL — dipakai halaman Cetak Jurnal PKL. Bisa diakses
     * admin, guru pembimbingnya, DUDI pemiliknya, atau siswa yang bersangkutan.
     */
    public function show(Request $request, PklPlacement $pklPlacement)
    {
        $user = $request->user();
        $boleh = $user->role === 'admin'
            || ($user->role === 'guru' && $user->teacher && $pklPlacement->guru_pembimbing_id === $user->teacher->id)
            || ($user->role === 'dudi' && $user->dudi && $pklPlacement->dudi_id === $user->dudi->id)
            || ($user->role === 'siswa' && $user->student && $pklPlacement->student_id === $user->student->id);

        if (!$boleh) {
            return response()->json(['message' => 'Anda tidak berwenang melihat penempatan ini.'], 403);
        }

        return $pklPlacement->load(['student.user', 'student.classRoom', 'dudi', 'guruPembimbing.user']);
    }

    /**
     * Buat penempatan PKL baru. Kalau siswa yang dipilih masih punya penempatan
     * berstatus "aktif" sebelumnya, ditolak dulu — supaya tidak ada 2 penempatan
     * aktif bertumpuk untuk 1 siswa yang sama (siswa jadi bingung absen ke mana).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id'          => 'required|exists:students,id',
            'dudi_id'              => 'required|exists:dudis,id',
            'guru_pembimbing_id'   => 'nullable|exists:teachers,id',
            'tanggal_mulai'        => 'required|date',
            'tanggal_selesai'      => 'required|date|after_or_equal:tanggal_mulai',
        ]);

        $sudahAktif = PklPlacement::where('student_id', $data['student_id'])
            ->where('status', 'aktif')->exists();

        if ($sudahAktif) {
            return response()->json([
                'message' => 'Siswa ini sudah punya penempatan PKL yang masih aktif. Selesaikan dulu penempatan lamanya sebelum membuat yang baru.',
            ], 422);
        }

        $placement = PklPlacement::create($data + ['status' => 'aktif']);

        return response()->json(
            $placement->load(['student.user', 'dudi', 'guruPembimbing.user']),
            201
        );
    }

    /**
     * Buat penempatan PKL untuk BANYAK siswa sekaligus (1 IDUKA + 1 guru
     * pembimbing + 1 jadwal untuk semuanya) — dipakai roster "Buat
     * Penempatan PKL" di layar admin: pilih kelas, centang siswa, isi IDUKA
     * & jadwal sekali. Siswa yang sudah punya penempatan aktif DILEWATI
     * (bukan menggagalkan seluruh batch), sama seperti pola
     * TagihanLainController::storeBulk() — supaya 1 siswa bermasalah tidak
     * menghentikan siswa lain dalam batch yang sama.
     */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'student_ids'          => 'required|array|min:1',
            'student_ids.*'        => 'exists:students,id',
            'dudi_id'              => 'required|exists:dudis,id',
            'guru_pembimbing_id'   => 'nullable|exists:teachers,id',
            'tanggal_mulai'        => 'required|date',
            'tanggal_selesai'      => 'required|date|after_or_equal:tanggal_mulai',
        ]);

        $studentIdsSudahAktif = PklPlacement::whereIn('student_id', $data['student_ids'])
            ->where('status', 'aktif')
            ->pluck('student_id');

        $studentIdsBaru = collect($data['student_ids'])->diff($studentIdsSudahAktif)->values();

        foreach ($studentIdsBaru as $studentId) {
            PklPlacement::create([
                'student_id'         => $studentId,
                'dudi_id'            => $data['dudi_id'],
                'guru_pembimbing_id' => $data['guru_pembimbing_id'] ?? null,
                'tanggal_mulai'      => $data['tanggal_mulai'],
                'tanggal_selesai'    => $data['tanggal_selesai'],
                'status'             => 'aktif',
            ]);
        }

        $namaDilewati = $studentIdsSudahAktif->isEmpty() ? [] : Student::with('user')
            ->whereIn('id', $studentIdsSudahAktif)
            ->get()
            ->map(fn ($s) => $s->user?->name ?? "Siswa #{$s->id}")
            ->values();

        $dibuat = $studentIdsBaru->count();
        $dilewati = count($namaDilewati);

        return response()->json([
            'message'  => "{$dibuat} penempatan PKL berhasil dibuat" . ($dilewati ? ", {$dilewati} siswa dilewati (sudah punya penempatan aktif)." : '.'),
            'dibuat'   => $dibuat,
            'dilewati' => $namaDilewati,
        ], 201);
    }

    public function update(Request $request, PklPlacement $pklPlacement)
    {
        $data = $request->validate([
            'dudi_id'            => 'sometimes|exists:dudis,id',
            'guru_pembimbing_id' => 'nullable|exists:teachers,id',
            'tanggal_mulai'      => 'sometimes|date',
            'tanggal_selesai'    => 'sometimes|date|after_or_equal:tanggal_mulai',
            'status'             => 'sometimes|in:aktif,selesai',
        ]);

        $pklPlacement->update($data);

        return $pklPlacement->fresh(['student.user', 'dudi', 'guruPembimbing.user']);
    }

    public function destroy(PklPlacement $pklPlacement)
    {
        $pklPlacement->delete();
        return response()->json(['message' => 'Penempatan PKL dihapus.']);
    }

    /**
     * Tutup SEMUA penempatan PKL yang statusnya masih "aktif" sekaligus —
     * dipakai admin di awal periode PKL baru. TIDAK menghapus data apa pun,
     * cuma mengubah status jadi "selesai" — semua riwayat absensi, jurnal,
     * dan penilaian IDUKA tetap tersimpan utuh dan bisa dibuka lagi kapan saja.
     * Setelah ini, siswa bisa dibuatkan penempatan baru untuk periode berikutnya.
     */
    public function tutupSemuaAktif()
    {
        $query = PklPlacement::where('status', 'aktif')->where('tahun_ajaran_id', TahunAjaran::aktifId());
        $jumlah = $query->count();

        $query->update([
            'status' => 'selesai',
            'tanggal_selesai' => now()->format('Y-m-d'),
        ]);

        return response()->json([
            'message' => "$jumlah penempatan PKL berhasil ditutup (ditandai selesai). Semua data riwayatnya tetap tersimpan.",
            'jumlah'  => $jumlah,
        ]);
    }

    /**
     * Kebalikan dari tutupSemuaAktif() — mengaktifkan kembali SEMUA
     * penempatan yang statusnya "selesai" jadi "aktif" lagi sekaligus.
     */
    public function aktifkanSemuaSelesai()
    {
        $query = PklPlacement::where('status', 'selesai')->where('tahun_ajaran_id', TahunAjaran::aktifId());
        $jumlah = $query->count();

        $query->update(['status' => 'aktif']);

        return response()->json([
            'message' => "$jumlah penempatan PKL berhasil diaktifkan kembali.",
            'jumlah'  => $jumlah,
        ]);
    }

    /**
     * Daftar siswa bimbingan guru yang sedang login (dipakai tab "Bimbingan PKL" di dashboard guru).
     */
    public function bimbinganSaya(Request $request)
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return response()->json([]);
        }

        return PklPlacement::with(['student.user', 'student.classRoom', 'dudi'])
            ->where('guru_pembimbing_id', $teacher->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('status')
            ->orderByDesc('tanggal_mulai')
            ->get();
    }

    /**
     * Daftar siswa yang ditempatkan di DUDI yang sedang login (dipakai dashboard DUDI).
     */
    public function siswaSaya(Request $request)
    {
        $dudi = $request->user()->dudi;
        if (!$dudi) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil DUDI.'], 404);
        }

        return PklPlacement::with(['student.user', 'student.classRoom', 'guruPembimbing.user'])
            ->where('dudi_id', $dudi->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('status')
            ->orderByDesc('tanggal_mulai')
            ->get();
    }

    /**
     * Penempatan PKL siswa yang sedang login, kalau ada yang aktif. Dipakai dashboard
     * siswa untuk menentukan apakah menu PKL perlu ditampilkan (menggantikan QR barcode).
     */
    /**
     * Penempatan PKL siswa yang sedang login — diutamakan yang masih AKTIF,
     * tapi kalau tidak ada (semua sudah "selesai"), tetap kembalikan yang
     * PALING BARU biar siswa masih bisa buka riwayat absensi & jurnal
     * kegiatannya walau PKL-nya sudah berakhir.
     */
    public function punyaKuSekarang(Request $request)
    {
        $student = $request->user()->student;
        if (!$student) {
            return response()->json(null);
        }

        $placement = $student->pklPlacements()
            ->with(['dudi', 'guruPembimbing.user'])
            ->orderByRaw("status = 'aktif' desc")
            ->orderByDesc('tanggal_mulai')
            ->first();


        return response()->json($placement);
    }
}
