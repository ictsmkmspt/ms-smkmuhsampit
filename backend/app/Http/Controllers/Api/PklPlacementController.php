<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklPlacement;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TahunAjaran;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PklPlacementController extends Controller
{
    /**
     * Semua penempatan PKL (admin), dengan filter opsional by status &
     * IDUKA (iduka_id) — iduka_id dipakai Laporan PKL > Kegiatan Siswa untuk
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
        $query = PklPlacement::with(['student.user', 'student.classRoom', 'iduka', 'guruPembimbing.user', 'penilaian']);
        if ($request->status) {
            $query->where('pkl_placements.status', $request->status);
        }
        if ($request->iduka_id) {
            $query->where('pkl_placements.iduka_id', $request->iduka_id);
        }
        if (!$request->boolean('semua_tahun')) {
            $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
            $query->where('pkl_placements.tahun_ajaran_id', $tahunAjaranId);
        }
        return $query
            ->join('idukas', 'idukas.id', '=', 'pkl_placements.iduka_id')
            ->join('students', 'students.id', '=', 'pkl_placements.student_id')
            ->join('users', 'users.id', '=', 'students.user_id')
            ->orderBy('idukas.nama_perusahaan')
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
     * admin, guru pembimbingnya, IDUKA pemiliknya, atau siswa yang bersangkutan.
     */
    public function show(Request $request, PklPlacement $pklPlacement)
    {
        $user = $request->user();
        $boleh = $user->role === 'admin'
            || ($user->role === 'guru' && $user->teacher && $pklPlacement->guru_pembimbing_id === $user->teacher->id)
            || ($user->role === 'iduka' && $user->iduka && $pklPlacement->iduka_id === $user->iduka->id)
            || ($user->role === 'siswa' && $user->student && $pklPlacement->student_id === $user->student->id);

        if (!$boleh) {
            return response()->json(['message' => 'Anda tidak berwenang melihat penempatan ini.'], 403);
        }

        return $pklPlacement->load(['student.user', 'student.classRoom', 'iduka', 'guruPembimbing.user']);
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
            'iduka_id'             => 'required|exists:idukas,id',
            'guru_pembimbing_id'   => 'nullable|exists:teachers,id',
            'tanggal_mulai'        => 'required|date',
            'tanggal_selesai'      => 'required|date|after_or_equal:tanggal_mulai',
        ]);

        $placement = DB::transaction(function () use ($data) {
            // lockForUpdate baris siswanya sendiri supaya 2 permintaan buat
            // penempatan hampir bersamaan untuk siswa yang sama diserialisasi
            // (menutup celah TOCTOU antara exists() dan create() di bawah).
            Student::whereKey($data['student_id'])->lockForUpdate()->first();

            $sudahAktif = PklPlacement::where('student_id', $data['student_id'])
                ->where('status', 'aktif')->exists();

            if ($sudahAktif) {
                return response()->json([
                    'message' => 'Siswa ini sudah punya penempatan PKL yang masih aktif. Selesaikan dulu penempatan lamanya sebelum membuat yang baru.',
                ], 422);
            }

            $placement = PklPlacement::create($data + ['status' => 'aktif']);

            return $placement->load(['student.user', 'iduka', 'guruPembimbing.user']);
        });

        if ($placement instanceof \Illuminate\Http\JsonResponse) {
            return $placement;
        }

        $this->notifyPenempatanBaru($placement);

        return response()->json($placement, 201);
    }

    /**
     * Notifikasi penempatan PKL baru — siswa, wali, dan guru pembimbing
     * (kalau sudah ditentukan sejak awal) sekaligus diberi tahu.
     */
    private function notifyPenempatanBaru(PklPlacement $placement): void
    {
        $placement->loadMissing(['student.user', 'student.parents', 'iduka', 'guruPembimbing.user']);
        $student = $placement->student;
        $namaIduka = $placement->iduka?->nama_perusahaan ?? '-';

        NotificationDispatcher::send($student->user, 'pkl', 'Penempatan PKL baru', "Kamu ditempatkan PKL di {$namaIduka}, mulai {$placement->tanggal_mulai}.", '/siswa');
        NotificationDispatcher::sendMany($student->parents, 'pkl', 'Penempatan PKL anak Anda', "{$student->user->name} ditempatkan PKL di {$namaIduka}, mulai {$placement->tanggal_mulai}.", '/wali');

        if ($placement->guruPembimbing?->user) {
            NotificationDispatcher::send($placement->guruPembimbing->user, 'pkl', 'Ditugaskan sebagai pembimbing PKL', "Anda ditugaskan membimbing {$student->user->name} PKL di {$namaIduka}.", '/guru');
        }
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
            'iduka_id'             => 'required|exists:idukas,id',
            'guru_pembimbing_id'   => 'nullable|exists:teachers,id',
            'tanggal_mulai'        => 'required|date',
            'tanggal_selesai'      => 'required|date|after_or_equal:tanggal_mulai',
        ]);

        [$studentIdsBaru, $studentIdsSudahAktif] = DB::transaction(function () use ($data) {
            // lockForUpdate seluruh siswa dalam batch dulu, baru cek status
            // aktifnya — menutup celah TOCTOU yang sama seperti store().
            Student::whereIn('id', $data['student_ids'])->lockForUpdate()->get();

            $studentIdsSudahAktif = PklPlacement::whereIn('student_id', $data['student_ids'])
                ->where('status', 'aktif')
                ->pluck('student_id');

            $studentIdsBaru = collect($data['student_ids'])->diff($studentIdsSudahAktif)->values();

            foreach ($studentIdsBaru as $studentId) {
                PklPlacement::create([
                    'student_id'         => $studentId,
                    'iduka_id'           => $data['iduka_id'],
                    'guru_pembimbing_id' => $data['guru_pembimbing_id'] ?? null,
                    'tanggal_mulai'      => $data['tanggal_mulai'],
                    'tanggal_selesai'    => $data['tanggal_selesai'],
                    'status'             => 'aktif',
                ]);
            }

            return [$studentIdsBaru, $studentIdsSudahAktif];
        });

        if ($studentIdsBaru->isNotEmpty()) {
            PklPlacement::with(['student.user', 'student.parents', 'iduka', 'guruPembimbing.user'])
                ->whereIn('student_id', $studentIdsBaru)
                ->where('status', 'aktif')
                ->where('iduka_id', $data['iduka_id'])
                ->get()
                ->each(fn ($p) => $this->notifyPenempatanBaru($p));
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
            'iduka_id'           => 'sometimes|exists:idukas,id',
            'guru_pembimbing_id' => 'nullable|exists:teachers,id',
            'tanggal_mulai'      => 'sometimes|date',
            'tanggal_selesai'    => 'sometimes|date|after_or_equal:tanggal_mulai',
            'status'             => 'sometimes|in:aktif,selesai',
        ]);

        $result = DB::transaction(function () use ($data, $pklPlacement) {
            $pklPlacement = PklPlacement::lockForUpdate()->findOrFail($pklPlacement->id);

            // Reaktivasi (selesai -> aktif) HARUS dicek juga, sama seperti
            // store() — kalau tidak, admin bisa tanpa sadar bikin 2
            // penempatan aktif sekaligus untuk siswa yang sama lewat
            // endpoint ini (bukan cuma lewat store()).
            if (($data['status'] ?? null) === 'aktif' && $pklPlacement->status !== 'aktif') {
                $adaAktifLain = PklPlacement::where('student_id', $pklPlacement->student_id)
                    ->where('id', '!=', $pklPlacement->id)
                    ->where('status', 'aktif')
                    ->exists();

                if ($adaAktifLain) {
                    return response()->json([
                        'message' => 'Siswa ini sudah punya penempatan PKL lain yang masih aktif.',
                    ], 422);
                }
            }

            $statusSelesai = ($data['status'] ?? null) === 'selesai' && $pklPlacement->status !== 'selesai';

            $pklPlacement->update($data);

            return [$pklPlacement->fresh(['student.user', 'student.parents', 'iduka', 'guruPembimbing.user']), $statusSelesai];
        });

        if ($result instanceof \Illuminate\Http\JsonResponse) {
            return $result;
        }

        [$pklPlacement, $statusSelesai] = $result;

        if ($statusSelesai) {
            $this->notifyPenempatanSelesai($pklPlacement);
        }

        return $pklPlacement;
    }

    /** Notifikasi penempatan PKL ditutup (status jadi "selesai") — siswa & wali. */
    private function notifyPenempatanSelesai(PklPlacement $placement): void
    {
        $student = $placement->student;
        $namaIduka = $placement->iduka?->nama_perusahaan ?? '-';

        NotificationDispatcher::send($student->user, 'pkl', 'Penempatan PKL selesai', "Penempatan PKL kamu di {$namaIduka} sudah ditandai selesai.", '/siswa');
        NotificationDispatcher::sendMany($student->parents, 'pkl', 'Penempatan PKL anak Anda selesai', "Penempatan PKL {$student->user->name} di {$namaIduka} sudah ditandai selesai.", '/wali');
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
        $placements = $query->with(['student.user', 'student.parents', 'iduka'])->get();
        $jumlah = $placements->count();

        $query->update([
            'status' => 'selesai',
            'tanggal_selesai' => now()->format('Y-m-d'),
        ]);

        $placements->each(fn ($p) => $this->notifyPenempatanSelesai($p));

        return response()->json([
            'message' => "$jumlah penempatan PKL berhasil ditutup (ditandai selesai). Semua data riwayatnya tetap tersimpan.",
            'jumlah'  => $jumlah,
        ]);
    }

    /**
     * Kebalikan dari tutupSemuaAktif() — mengaktifkan kembali penempatan
     * yang statusnya "selesai" jadi "aktif" lagi sekaligus. SENGAJA tidak
     * asal aktifkan SEMUA baris "selesai" tanpa pandang bulu — 2 guard
     * dipasang supaya tidak menghasilkan >1 penempatan aktif untuk 1 siswa
     * yang sama: (1) siswa yang kadung sudah punya penempatan aktif di
     * tahun ajaran manapun dilewati, (2) siswa yang punya beberapa baris
     * "selesai" di tahun ajaran ini (mis. sempat pindah IDUKA) cuma
     * diaktifkan yang PALING BARU.
     */
    public function aktifkanSemuaSelesai()
    {
        $tahunAjaranId = TahunAjaran::aktifId();

        $sudahAktifStudentIds = PklPlacement::where('status', 'aktif')->pluck('student_id');

        $idsTerpilih = PklPlacement::where('status', 'selesai')
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->whereNotIn('student_id', $sudahAktifStudentIds)
            ->get()
            ->groupBy('student_id')
            ->map(fn ($rows) => $rows->sortByDesc('tanggal_mulai')->first()->id);

        $jumlah = $idsTerpilih->count();

        PklPlacement::whereIn('id', $idsTerpilih)->update(['status' => 'aktif']);

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

        return PklPlacement::with(['student.user', 'student.classRoom', 'iduka'])
            ->where('guru_pembimbing_id', $teacher->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('status')
            ->orderByDesc('tanggal_mulai')
            ->get();
    }

    /**
     * Daftar siswa yang ditempatkan di IDUKA yang sedang login (dipakai dashboard IDUKA).
     */
    public function siswaSaya(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }

        return PklPlacement::with(['student.user', 'student.classRoom', 'guruPembimbing.user'])
            ->where('iduka_id', $iduka->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('status')
            ->orderByDesc('tanggal_mulai')
            ->get();
    }

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

        $placement = $student->pklPlacementTerkini()?->load(['iduka', 'guruPembimbing.user']);

        return response()->json($placement);
    }
}
