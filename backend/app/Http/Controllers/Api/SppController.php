<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Spp;
use App\Models\Student;
use Illuminate\Http\Request;

class SppController extends Controller
{
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
        $students = Student::with(['user', 'classRoom', 'spps' => fn ($q) => $q->where('status', 'belum_bayar')])
            ->where('status', 'lulus')
            ->whereHas('spps', fn ($q) => $q->where('status', 'belum_bayar'))
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
                    'total_tunggakan' => $s->spps->sum('nominal'),
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

        $sudahAda = Spp::where('student_id', $data['student_id'])
            ->where('bulan', $data['bulan'])->where('tahun', $data['tahun'])
            ->exists();

        if ($sudahAda) {
            return response()->json(['message' => 'Tagihan SPP siswa ini untuk bulan tersebut sudah ada.'], 422);
        }

        $spp = Spp::create([
            'student_id' => $data['student_id'],
            'bulan' => $data['bulan'],
            'tahun' => $data['tahun'],
            'nominal' => (int) Setting::get('spp_nominal_default', '0'),
            'status' => 'lunas',
            'tanggal_bayar' => now()->toDateString(),
            'dicatat_oleh' => $request->user()->id,
        ]);

        return $spp->load(['student.user', 'student.classRoom']);
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

        $spp->update(['nominal' => $data['nominal']]);

        return $spp->load(['student.user', 'student.classRoom']);
    }

    public function updateStatus(Request $request, Spp $spp)
    {
        $data = $request->validate([
            'status' => 'required|in:belum_bayar,lunas',
        ]);

        $spp->update([
            'status' => $data['status'],
            'jumlah_dibayar' => $data['status'] === 'lunas' ? $spp->nominal : 0,
            'tanggal_bayar' => $data['status'] === 'lunas' ? now()->toDateString() : null,
            'dicatat_oleh' => $request->user()->id,
        ]);

        return $spp->load(['student.user', 'student.classRoom']);
    }

    /**
     * Catat pembayaran SEBAGIAN (cicilan) — jumlah yang dibayar ditambahkan
     * ke akumulasi jumlah_dibayar. Status otomatis jadi "lunas" begitu
     * akumulasinya mencapai nominal penuh, atau "sebagian" kalau masih kurang.
     */
    public function bayarSebagian(Request $request, Spp $spp)
    {
        $sisa = $spp->nominal - $spp->jumlah_dibayar;

        if ($sisa <= 0) {
            return response()->json(['message' => 'Tagihan ini sudah lunas.'], 422);
        }

        $data = $request->validate([
            'jumlah' => "required|integer|min:1|max:{$sisa}",
        ], [
            'jumlah.max' => "Jumlah bayar melebihi sisa tagihan (Rp" . number_format($sisa, 0, ',', '.') . ").",
        ]);

        $jumlahBaru = $spp->jumlah_dibayar + $data['jumlah'];

        $spp->update([
            'jumlah_dibayar' => $jumlahBaru,
            'status' => $jumlahBaru >= $spp->nominal ? 'lunas' : 'sebagian',
            'tanggal_bayar' => now()->toDateString(),
            'dicatat_oleh' => $request->user()->id,
        ]);

        return $spp->load(['student.user', 'student.classRoom']);
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
     * default) dan mau ulang dari awal untuk bulan itu.
     */
    public function destroyBulan(Request $request)
    {
        $data = $request->validate([
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2100',
        ]);

        $dihapus = Spp::where('bulan', $data['bulan'])->where('tahun', $data['tahun'])->delete();

        return response()->json([
            'message' => "Berhasil menghapus {$dihapus} tagihan SPP bulan {$data['bulan']}/{$data['tahun']}.",
            'dihapus' => $dihapus,
        ]);
    }
}
