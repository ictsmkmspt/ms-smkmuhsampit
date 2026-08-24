<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Spp;
use App\Models\SppPembayaran;
use App\Models\Student;
use App\Models\TagihanLain;
use App\Services\NotificationDispatcher;
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
        $statusBaru = $totalDibayar >= $spp->nominal ? 'lunas' : 'sebagian';
        $spp->update([
            'jumlah_dibayar' => $totalDibayar,
            'status' => $statusBaru,
            'tanggal_bayar' => $tanggal,
            'dicatat_oleh' => $dicatatOleh,
        ]);

        $bulanNama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][$spp->bulan] ?? $spp->bulan;
        $judul = $statusBaru === 'lunas' ? 'Pembayaran SPP lunas' : 'Pembayaran SPP diterima (sebagian)';
        $pesan = "SPP {$bulanNama} {$spp->tahun} — Rp" . number_format($jumlah, 0, ',', '.') . ' diterima. ' .
            ($statusBaru === 'lunas' ? 'Tagihan bulan ini sudah lunas.' : 'Tagihan bulan ini masih sebagian, sisa Rp' . number_format($spp->nominal - $totalDibayar, 0, ',', '.') . '.');

        if ($spp->student->user) {
            NotificationDispatcher::send($spp->student->user, 'spp', $judul, $pesan, '/siswa');
            NotificationDispatcher::sendMany($spp->student->parents, 'spp', $judul, "{$spp->student->user->name} — {$pesan}", '/wali');
        }

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
        // Tampilkan SEMUA alumni (bukan cuma yang masih bertunggakan) —
        // TU perlu lihat siapa saja yang sudah benar-benar lunas juga,
        // bukan cuma daftar tagih. 'sebagian' HARUS ikut, bukan cuma
        // 'belum_bayar' — alumni yang sempat nyicil tapi belum lunas
        // sebelumnya diam-diam hilang dari daftar tunggakan ini. Sisa
        // tunggakan per baris juga dihitung (nominal - jumlah_dibayar),
        // bukan nominal penuh, supaya cicilan yang sudah masuk tidak ikut
        // ditagih ulang — konsisten dengan LaporanController::tunggakan().
        //
        // Tagihan Lain HARUS ikut dihitung juga, bukan cuma SPP — sebelumnya
        // alumni yang tunggakannya murni Tagihan Lain (tanpa tunggakan SPP
        // sama sekali) tampil "Lunas" padahal masih ada tagihan lain yang
        // belum dibayar.
        $lainAgg = TagihanLain::where('status', '!=', 'lunas')
            ->whereHas('student', fn ($q) => $q->where('status', 'lulus'))
            ->selectRaw('student_id, SUM(nominal - jumlah_dibayar) as total, COUNT(*) as jumlah')
            ->groupBy('student_id')
            ->get()
            ->keyBy('student_id');

        $students = Student::with(['user', 'classRoom', 'spps' => fn ($q) => $q->where('status', '!=', 'lunas')])
            ->where('status', 'lulus')
            ->get()
            ->map(function ($s) use ($lainAgg) {
                $tunggakanSpp = $s->spps->sum(fn ($spp) => $spp->nominal - $spp->jumlah_dibayar);
                $lain = $lainAgg->get($s->id);
                $tunggakanLain = $lain ? (int) $lain->total : 0;

                return [
                    'student' => [
                        'id' => $s->id,
                        'nis' => $s->nis,
                        'tanggal_lulus' => $s->tanggal_lulus,
                        'user' => $s->user,
                        'class_room' => $s->classRoom,
                    ],
                    'jumlah_tunggakan' => $s->spps->count(),
                    'jumlah_tunggakan_lain' => $lain ? (int) $lain->jumlah : 0,
                    'tunggakan_spp' => $tunggakanSpp,
                    'tunggakan_lain' => $tunggakanLain,
                    'total_tunggakan' => $tunggakanSpp + $tunggakanLain,
                ];
            })
            ->sortBy(fn ($row) => $row['student']['user']->name ?? '')
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
            $student = Student::lockForUpdate()->findOrFail($data['student_id']);

            if ($student->status === 'lulus') {
                return response()->json(['message' => 'Siswa ini sudah alumni, tidak bisa dibuatkan tagihan SPP baru.'], 422);
            }

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
                // "Batalkan" — kalau "lunas"-nya tercapai lewat top-up
                // otomatis (tombol Tandai Lunas menambah selisih sebagai 1
                // baris riwayat berketerangan "Ditandai lunas manual"),
                // batalkan berarti menghapus KEMBALI baris top-up itu, lalu
                // jumlah_dibayar dihitung ulang dari riwayat yang tersisa.
                // Sebelumnya cuma status yang diganti tanpa menyentuh
                // jumlah_dibayar — hasilnya data ganjil: status "Sebagian"
                // padahal jumlah_dibayar sudah = nominal (sisa Rp0).
                $spp->refresh();
                $topUp = $spp->pembayaran()->where('keterangan', 'Ditandai lunas manual')->latest()->first();

                if ($topUp) {
                    $topUp->delete();
                    $spp->refresh();
                    $totalDibayar = (int) $spp->pembayaran()->sum('jumlah');
                    $spp->update([
                        'jumlah_dibayar' => $totalDibayar,
                        'status' => $totalDibayar > 0 ? 'sebagian' : 'belum_bayar',
                        'tanggal_bayar' => $spp->pembayaran()->latest('tanggal_bayar')->value('tanggal_bayar'),
                        'dicatat_oleh' => $request->user()->id,
                    ]);
                } elseif ($spp->pembayaran()->count() === 0) {
                    // Data lama dari sebelum riwayat pembayaran (ledger) ada —
                    // jumlah_dibayar/status di-set langsung tanpa baris riwayat
                    // sama sekali, jadi tidak ada apa pun buat dihapus lewat
                    // Riwayat. Karena riwayatnya memang kosong (bukan ada
                    // cicilan sungguhan yang tersembunyi), aman untuk langsung
                    // di-reset ke Belum Bayar.
                    $spp->update([
                        'jumlah_dibayar' => 0,
                        'status' => 'belum_bayar',
                        'tanggal_bayar' => null,
                        'dicatat_oleh' => $request->user()->id,
                    ]);
                } else {
                    // Lunas tercapai murni dari cicilan asli (bukan lewat
                    // tombol Tandai Lunas) — tidak ada top-up buatan yang
                    // bisa dihapus, jadi tidak bisa "dibatalkan" begitu saja
                    // tanpa menghapus pembayaran sungguhan.
                    return response()->json([
                        'message' => 'Tagihan ini lunas dari cicilan asli (bukan tombol Tandai Lunas), tidak bisa dibatalkan langsung. Hapus/koreksi riwayat pembayarannya manual kalau memang perlu.',
                    ], 422);
                }
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
     * Riwayat baris pembayaran (cicilan) 1 tagihan SPP — dipakai TU untuk
     * mengoreksi kalau ada baris yang salah input jumlahnya (lihat
     * hapusPembayaran()).
     */
    public function riwayatPembayaran(Spp $spp)
    {
        return $spp->pembayaran()->with('dicatatOleh')->orderByDesc('tanggal_bayar')->orderByDesc('id')->get();
    }

    /**
     * Hapus 1 baris cicilan yang salah input — dipakai TU untuk koreksi
     * (mis. salah ketik jumlah bayar sebagian). jumlah_dibayar/status/
     * tanggal_bayar di induk dihitung ulang dari sisa riwayat yang ada,
     * pola sama seperti catatPembayaranSpp() tapi arah sebaliknya (kurangi,
     * bukan tambah).
     */
    public function hapusPembayaran(Spp $spp, SppPembayaran $pembayaran)
    {
        if ($pembayaran->spp_id !== $spp->id) {
            abort(404);
        }

        return DB::transaction(function () use ($spp, $pembayaran) {
            $spp = Spp::lockForUpdate()->findOrFail($spp->id);
            $pembayaran->delete();

            $totalDibayar = (int) $spp->pembayaran()->sum('jumlah');
            $spp->update([
                'jumlah_dibayar' => $totalDibayar,
                'status' => $totalDibayar >= $spp->nominal ? 'lunas' : ($totalDibayar > 0 ? 'sebagian' : 'belum_bayar'),
                'tanggal_bayar' => $spp->pembayaran()->latest('tanggal_bayar')->value('tanggal_bayar'),
            ]);

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
