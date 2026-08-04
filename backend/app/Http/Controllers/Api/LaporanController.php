<?php

namespace App\Http\Controllers\Api;

use App\Exports\LaporanKeuanganExport;
use App\Exports\LaporanTunggakanExport;
use App\Http\Controllers\Controller;
use App\Models\Spp;
use App\Models\Student;
use App\Models\TagihanLain;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class LaporanController extends Controller
{
    /**
     * Rekap keuangan 1 bulan — total uang yang benar-benar MASUK di bulan itu
     * (berdasarkan tanggal_bayar, bukan bulan tagihannya), gabungan SPP +
     * Tagihan Lain. Beda dari Tagihan SPP yang mengelompokkan berdasarkan
     * "tagihan untuk bulan apa", di sini yang dihitung "kapan dibayarnya" —
     * lebih pas buat laporan kas ke kepala sekolah/yayasan.
     */
    public function keuangan(Request $request)
    {
        [$start, $end] = $this->rentangBulan($request);

        $rincianSpp = Spp::with(['student.user', 'student.classRoom'])
            ->whereBetween('tanggal_bayar', [$start, $end])
            ->where('jumlah_dibayar', '>', 0)
            ->orderBy('tanggal_bayar')
            ->get();

        $rincianLain = TagihanLain::with(['student.user', 'student.classRoom'])
            ->whereBetween('tanggal_bayar', [$start, $end])
            ->where('jumlah_dibayar', '>', 0)
            ->orderBy('tanggal_bayar')
            ->get();

        $totalSpp = $rincianSpp->sum('jumlah_dibayar');
        $totalLain = $rincianLain->sum('jumlah_dibayar');

        return response()->json([
            'total_spp' => $totalSpp,
            'total_lain' => $totalLain,
            'total_keseluruhan' => $totalSpp + $totalLain,
            'jumlah_transaksi_spp' => $rincianSpp->count(),
            'jumlah_transaksi_lain' => $rincianLain->count(),
            'rincian_spp' => $rincianSpp,
            'rincian_lain' => $rincianLain,
        ]);
    }

    public function keuanganExport(Request $request)
    {
        [$start, $end, $bulan, $tahun] = $this->rentangBulan($request, true);

        return Excel::download(
            new LaporanKeuanganExport($start, $end),
            "laporan-keuangan-{$tahun}-{$bulan}.xlsx"
        );
    }

    /**
     * Daftar siswa dengan tunggakan (SPP + Tagihan Lain belum lunas/sebagian),
     * diurutkan dari total tunggakan terbesar — buat prioritas penagihan.
     * Pakai query agregat (bukan loop per siswa) supaya tetap cepat walau
     * jumlah siswa banyak.
     */
    public function tunggakan(Request $request)
    {
        $data = $request->validate([
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'search' => 'nullable|string|max:100',
        ]);

        $sppAgg = Spp::where('status', '!=', 'lunas')
            ->selectRaw('student_id, SUM(nominal - jumlah_dibayar) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $lainAgg = TagihanLain::where('status', '!=', 'lunas')
            ->selectRaw('student_id, SUM(nominal - jumlah_dibayar) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $studentIds = $sppAgg->keys()->merge($lainAgg->keys())->unique();

        $query = Student::with(['user', 'classRoom'])->whereIn('id', $studentIds);
        if (!empty($data['class_room_id'])) {
            $query->where('class_room_id', $data['class_room_id']);
        }
        if (!empty($data['search'])) {
            $search = $data['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nis', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }

        $hasil = $query->get()->map(function ($student) use ($sppAgg, $lainAgg) {
            $tunggakanSpp = (int) ($sppAgg[$student->id] ?? 0);
            $tunggakanLain = (int) ($lainAgg[$student->id] ?? 0);
            return [
                'student' => $student,
                'tunggakan_spp' => $tunggakanSpp,
                'tunggakan_lain' => $tunggakanLain,
                'total_tunggakan' => $tunggakanSpp + $tunggakanLain,
            ];
        })->sortByDesc('total_tunggakan')->values();

        return response()->json($hasil);
    }

    public function tunggakanExport(Request $request)
    {
        $data = $this->tunggakan($request)->getData(true);

        return Excel::download(new LaporanTunggakanExport($data), 'laporan-tunggakan.xlsx');
    }

    /**
     * Ambil rentang tanggal 1 bulan penuh dari input bulan+tahun (default
     * bulan berjalan kalau tidak dikirim). $withParts=true juga mengembalikan
     * angka bulan/tahunnya sendiri (dipakai buat nama file export).
     */
    private function rentangBulan(Request $request, bool $withParts = false): array
    {
        $bulan = (int) ($request->bulan ?: now()->format('n'));
        $tahun = (int) ($request->tahun ?: now()->format('Y'));

        $start = sprintf('%04d-%02d-01', $tahun, $bulan);
        $end = date('Y-m-t', strtotime($start));

        return $withParts ? [$start, $end, $bulan, $tahun] : [$start, $end];
    }
}
