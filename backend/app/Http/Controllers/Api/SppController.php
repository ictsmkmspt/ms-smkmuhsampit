<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Spp;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SppController extends Controller
{
    /**
     * Satu-satunya jalan mengubah jumlah_dibayar — selalu lewat baris
     * riwayat pembayaran dulu (supaya laporan kas per-bulan akurat &
     * cicilan lintas bulan tidak saling menimpa), baru jumlah_dibayar /
     * status / tanggal_bayar di induk di-cache ulang dari total riwayatnya.
     */
    private function catatPembayaranSpp(Spp $spp, int $jumlah, string $tanggal, ?int $dicatatOleh, ?string $keterangan = null): Spp
    {
        $spp->pembayaran()->create([
            'jumlah' => $jumlah,
            'tanggal_bayar' => $tanggal,
            'dicatat_oleh' => $dicatatOleh,
            'keterangan' => $keterangan,
        ]);

        $totalDibayar = (int) $spp->pembayaran()->sum('jumlah');
        $spp->update([
            'jumlah_dibayar' => $totalDibayar,
            'status' => $totalDibayar >= $spp->nominal ? 'lunas' : 'sebagian',
            'tanggal_bayar' => $tanggal,
            'dicatat_oleh' => $dicatatOleh,
        ]);

        return $spp;
    }

    public function settings()
    {
        return response()->json([
            'nominal_default' => (int) Setting::get('spp_nominal_default', '0'),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'nominal_default' => 'required|integer|min:0',
        ]);

        Setting::set('spp_nominal_default', (string) $data['nominal_default']);

        return response()->json([
            'message' => 'Nominal default SPP berhasil disimpan.',
            'nominal_default' => $data['nominal_default'],
        ]);
    }

    /**
     * Riwayat SPP 1 siswa (semua bulan/tahun) — dipakai TU untuk fitur
     * cari siswa & bayar langsung di Dashboard, tanpa harus tahu dulu
     * tagihan itu ada di bulan/tahun berapa.
     */
    public function byStudent($studentId)
    {
        $student = Student::with(['user', 'classRoom'])->findOrFail($studentId);
        $spps = Spp::where('student_id', $studentId)
            ->orderByDesc('tahun')->orderByDesc('bulan')
            ->get();

        return response()->json([
            'student' => $student,
            'spp' => $spps,
        ]);
    }

    /**
     * Detail 1 tagihan SPP lengkap (siswa, kelas, siapa yang mencatat) —
     * dipakai untuk cetak nota pembayaran.
     */
    public function show(Spp $spp)
    {
        return $spp->load(['student.user', 'student.classRoom', 'dicatatOleh']);
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2100',
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'status' => 'nullable|in:belum_bayar,sebagian,lunas',
            'search' => 'nullable|string|max:100',
        ]);

        $query = Spp::with(['student.user', 'student.classRoom'])
            ->where('bulan', $data['bulan'])
            ->where('tahun', $data['tahun']);

        if (!empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        if (!empty($data['class_room_id'])) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $data['class_room_id']));
        }

        if (!empty($data['search'])) {
            $search = $data['search'];
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('nis', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }

        $spps = $query->get()->sortBy(fn ($s) => $s->student?->user?->name ?? '')->values();

        return response()->json([
            'data' => $spps,
            'total_siswa' => Student::where('status', 'aktif')->count(),
        ]);
    }

    /**
     * Daftar alumni (siswa berstatus lulus) yang masih punya tunggakan SPP —
     * dipakai menu Alumni di TU supaya penagihan tetap fokus ke yang benar-
     * benar masih ada tanggungannya, bukan semua alumni.
     */
    public function alumni()
    {
        // 'sebagian' HARUS ikut, bukan cuma 'belum_bayar' — alumni yang
        // sempat nyicil tapi belum lunas sebelumnya diam-diam hilang dari
        // daftar tunggakan ini. Sisa tunggakan per baris juga dihitung
        // (nominal - jumlah_dibayar), bukan nominal penuh, supaya
        // cicilan yang sudah masuk tidak ikut ditagih ulang — konsisten
        // dengan LaporanController::tunggakan().
        $students = Student::with(['user', 'classRoom', 'spps' => fn ($q) => $q->where('status', '!=', 'lunas')])
            ->where('status', 'lulus')
            ->whereHas('spps', fn ($q) => $q->where('status', '!=', 'lunas'))
            ->get()
            ->map(function ($s) {
                return [
                    'student' => [
                        'id' => $s->id,
                        'nis' => $s->nis,
                        'tanggal_lulus' => $s->tanggal_lulus,
                        'user' => $s->user,
                        'class_room' => $s->classRoom,
                    ],
                    'jumlah_tunggakan' => $s->spps->count(),
                    'total_tunggakan' => $s->spps->sum(fn ($spp) => $spp->nominal - $spp->jumlah_dibayar),
                ];
            })
            ->sortByDesc('total_tunggakan')
            ->values();

        return response()->json($students);
    }

    /**
     * Buat tagihan SPP bulan tertentu untuk semua siswa yang belum punya
     * catatan di bulan itu, pakai nominal default dari pengaturan.
     */
    public function generate(Request $request)
    {
        $data = $request->validate([
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2100',
        ]);

        $dibuat = Spp::generateBulanan($data['bulan'], $data['tahun']);

        return response()->json([
            'message' => "Berhasil membuat tagihan SPP untuk {$dibuat} siswa.",
            'dibuat' => $dibuat,
        ]);
    }

    /**
     * Bayar SPP di muka untuk 1 siswa saja, buat bulan yang belum digenerate
     * massal — dipakai kalau ada orang tua yang mau bayar duluan sebelum
     * tanggal 1. Sengaja TIDAK lewat generateBulanan() (yang bikin tagihan
     * utk SEMUA siswa aktif) supaya orang tua lain tidak ikut lihat tagihan
     * bulan depan sebelum waktunya — cuma siswa ini yang dapat tagihannya,
     * dan langsung berstatus lunas.
     */
    public function bayarDimuka(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2100',
        ]);

        return DB::transaction(function () use ($data, $request) {
            $sudahAda = Spp::where('student_id', $data['student_id'])
                ->where('bulan', $data['bulan'])->where('tahun', $data['tahun'])
                ->lockForUpdate()->exists();

            if ($sudahAda) {
                return response()->json(['message' => 'Tagihan SPP siswa ini untuk bulan tersebut sudah ada.'], 422);
            }

            $nominal = (int) Setting::get('spp_nominal_default', '0');
            $spp = Spp::create([
                'student_id' => $data['student_id'],
                'bulan' => $data['bulan'],
                'tahun' => $data['tahun'],
                'nominal' => $nominal,
                'status' => 'belum_bayar',
                'dicatat_oleh' => $request->user()->id,
            ]);

            // Lunas dibayar penuh SEKALIGUS dicatat sebagai 1 setoran di
            // riwayat pembayaran — supaya ikut terhitung di Laporan
            // Keuangan bulan ini (sebelumnya jumlah_dibayar tidak pernah
            // diisi sama sekali, uangnya "hilang" dari laporan kas).
            if ($nominal > 0) {
                $this->catatPembayaranSpp($spp, $nominal, now()->toDateString(), $request->user()->id, 'Bayar di muka');
            } else {
                $spp->update(['status' => 'lunas']);
            }

            return $spp->fresh(['student.user', 'student.classRoom']);
        });
    }

    /**
     * Ubah nominal SPP 1 siswa (dipakai TU kalau ada kasus khusus:
     * beasiswa, potongan, dsb — beda dari nominal default).
     */
    public function update(Request $request, Spp $spp)
    {
        $data = $request->validate([
            'nominal' => 'required|integer|min:0',
        ]);

        // Status HARUS dihitung ulang terhadap jumlah_dibayar yang sudah
        // ada — kalau tidak, nominal dinaikkan di atas tagihan yang sudah
        // "lunas" akan diam-diam menyembunyikan sisa kekurangannya dari
        // laporan tunggakan, atau nominal diturunkan di bawah jumlah_dibayar
        // bikin "sisa" tampil negatif di UI.
        $spp->update(['nominal' => $data['nominal']]);
        $spp->update(['status' => $spp->jumlah_dibayar >= $spp->nominal
            ? 'lunas'
            : ($spp->jumlah_dibayar > 0 ? 'sebagian' : 'belum_bayar')]);

        return $spp->fresh(['student.user', 'student.classRoom']);
    }

    public function updateStatus(Request $request, Spp $spp)
    {
        $data = $request->validate([
            'status' => 'required|in:belum_bayar,lunas',
        ]);

        return DB::transaction(function () use ($data, $spp, $request) {
            $spp = Spp::lockForUpdate()->findOrFail($spp->id);

            if ($data['status'] === 'lunas') {
                $sisa = $spp->nominal - $spp->jumlah_dibayar;
                if ($sisa > 0) {
                    $this->catatPembayaranSpp($spp, $sisa, now()->toDateString(), $request->user()->id, 'Ditandai lunas manual');
                }
            } else {
                // "Batalkan" — SENGAJA tidak menghapus riwayat pembayaran
                // yang sudah tercatat (uang yang sudah diterima tetap
                // tersimpan). Statusnya cuma dilepas dari "lunas": balik
                // ke "sebagian" kalau ternyata masih ada cicilan asli yang
                // sudah masuk, atau "belum_bayar" kalau memang belum ada
                // setoran sama sekali.
                $spp->refresh();
                $spp->update([
                    'status' => $spp->jumlah_dibayar > 0 ? 'sebagian' : 'belum_bayar',
                    'dicatat_oleh' => $request->user()->id,
                ]);
            }

            return $spp->fresh(['student.user', 'student.classRoom']);
        });
    }

    /**
     * Catat pembayaran SEBAGIAN (cicilan) — jumlah yang dibayar ditambahkan
     * ke akumulasi jumlah_dibayar (lewat riwayat pembayaran, bukan
     * menimpa). Status otomatis jadi "lunas" begitu akumulasinya mencapai
     * nominal penuh, atau "sebagian" kalau masih kurang.
     */
    public function bayarSebagian(Request $request, Spp $spp)
    {
        return DB::transaction(function () use ($request, $spp) {
            // lockForUpdate DULU baru hitung sisa — supaya 2 pembayaran
            // hampir bersamaan (2 komputer TU) diserialisasi, tidak
            // sama-sama membaca jumlah_dibayar basi & saling menimpa.
            $spp = Spp::lockForUpdate()->findOrFail($spp->id);
            $sisa = $spp->nominal - $spp->jumlah_dibayar;

            if ($sisa <= 0) {
                return response()->json(['message' => 'Tagihan ini sudah lunas.'], 422);
            }

            $data = $request->validate([
                'jumlah' => "required|integer|min:1|max:{$sisa}",
            ], [
                'jumlah.max' => "Jumlah bayar melebihi sisa tagihan (Rp" . number_format($sisa, 0, ',', '.') . ").",
            ]);

            $this->catatPembayaranSpp($spp, $data['jumlah'], now()->toDateString(), $request->user()->id);

            return $spp->fresh(['student.user', 'student.classRoom']);
        });
    }

    /**
     * Hapus 1 tagihan SPP — dipakai TU kalau salah generate/salah klik.
     */
    public function destroy(Spp $spp)
    {
        $spp->delete();

        return response()->json(['message' => 'Tagihan SPP dihapus.']);
    }

    /**
     * Hapus semua tagihan SPP 1 bulan sekaligus (kebalikan dari generate) —
     * dipakai TU kalau salah generate massal (misal salah bulan/nominal
     * default) dan mau ulang dari awal untuk bulan itu. Sengaja HANYA
     * menghapus yang masih 'belum_bayar' (belum ada uang masuk sama
     * sekali) — sebelumnya menghapus SEMUA tanpa pandang status, jadi
     * ikut menghapus tagihan yang sudah lunas/dicicil beserta bukti
     * pembayarannya. Kalau TU memang perlu hapus tagihan yang sudah ada
     * pembayarannya, hapus manual satu-satu lewat tombol di baris tabel
     * (destroy() di atas), bukan lewat aksi massal ini.
     */
    public function destroyBulan(Request $request)
    {
        $data = $request->validate([
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2100',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        $query = Spp::where('bulan', $data['bulan'])->where('tahun', $data['tahun'])->where('status', 'belum_bayar');
        if (!empty($data['class_room_id'])) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $data['class_room_id']));
        }
        $dihapus = $query->delete();

        return response()->json([
            'message' => "Berhasil menghapus {$dihapus} tagihan SPP bulan {$data['bulan']}/{$data['tahun']} yang belum dibayar (tagihan yang sudah lunas/dicicil TIDAK ikut terhapus).",
            'dihapus' => $dihapus,
        ]);
    }
}
