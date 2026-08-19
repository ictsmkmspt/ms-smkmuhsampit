<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\Attendance;
use App\Models\Buku;
use App\Models\BukuEksemplar;
use App\Models\PerpustakaanKunjungan;
use App\Models\PerpustakaanPeminjaman;
use App\Models\PklPlacement;
use App\Models\PpdbPendaftar;
use App\Models\Spp;
use App\Models\SppPembayaran;
use App\Models\Student;
use App\Models\TagihanLain;
use App\Models\TagihanLainPembayaran;
use App\Models\Teacher;
use App\Models\User;
use App\Models\Violation;

/**
 * Dashboard ringkasan lintas modul untuk Kepala Sekolah — READ ONLY, satu
 * endpoint menggabungkan angka-angka penting dari tiap bidang (kesiswaan,
 * PKL, perpustakaan, keuangan, kepegawaian, PPDB) langsung dari query
 * ringkas masing-masing, bukan memanggil endpoint laporan detail satu-satu,
 * supaya dashboard-nya ringan & cepat dimuat.
 */
class KepalaSekolahDashboardController extends Controller
{
    public function ringkasan()
    {
        $today = now()->toDateString();
        $awalBulan = now()->startOfMonth()->toDateString();
        $akhirBulan = now()->endOfMonth()->toDateString();

        return response()->json([
            'kesiswaan' => $this->kesiswaan($today, $awalBulan, $akhirBulan),
            'pkl' => $this->pkl(),
            'perpustakaan' => $this->perpustakaan($awalBulan, $akhirBulan),
            'keuangan' => $this->keuangan($awalBulan, $akhirBulan),
            'kepegawaian' => $this->kepegawaian(),
            'ppdb' => $this->ppdb(),
        ]);
    }

    private function kesiswaan(string $today, string $awalBulan, string $akhirBulan): array
    {
        $hadirHariIni = Attendance::where('date', $today)->where('status', 'hadir')->count();
        $tercatatHariIni = Attendance::where('date', $today)->count();

        return [
            'total_siswa_aktif' => Student::where('status', 'aktif')->count(),
            'total_siswa_lulus' => Student::where('status', 'lulus')->count(),
            'kehadiran_hari_ini' => [
                'hadir' => $hadirHariIni,
                'tercatat' => $tercatatHariIni,
                'persen' => $tercatatHariIni > 0 ? round($hadirHariIni / $tercatatHariIni * 100, 1) : null,
            ],
            'pelanggaran_bulan_ini' => Violation::whereBetween('date', [$awalBulan, $akhirBulan])->count(),
            'prestasi_bulan_ini' => Achievement::whereBetween('date', [$awalBulan, $akhirBulan])->count(),
        ];
    }

    private function pkl(): array
    {
        return [
            'total_penempatan_aktif' => PklPlacement::where('status', 'aktif')->count(),
            'total_penempatan_selesai' => PklPlacement::where('status', 'selesai')->count(),
        ];
    }

    private function perpustakaan(string $awalBulan, string $akhirBulan): array
    {
        $eksemplar = BukuEksemplar::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return [
            'total_judul' => Buku::count(),
            'total_eksemplar' => (int) $eksemplar->sum(),
            'sedang_dipinjam' => (int) ($eksemplar['dipinjam'] ?? 0),
            'terlambat' => PerpustakaanPeminjaman::where('status', 'dipinjam')
                ->whereDate('tanggal_jatuh_tempo', '<', now()->toDateString())
                ->count(),
            'kunjungan_bulan_ini' => PerpustakaanKunjungan::whereBetween('tanggal', [$awalBulan, $akhirBulan])->count(),
        ];
    }

    private function keuangan(string $awalBulan, string $akhirBulan): array
    {
        $terkumpulSpp = (float) SppPembayaran::whereBetween('tanggal_bayar', [$awalBulan, $akhirBulan])->sum('jumlah');
        $terkumpulLain = (float) TagihanLainPembayaran::whereBetween('tanggal_bayar', [$awalBulan, $akhirBulan])->sum('jumlah');

        $tunggakanSpp = (float) (Spp::where('status', '!=', 'lunas')->selectRaw('SUM(nominal - jumlah_dibayar) as total')->value('total') ?? 0);
        $tunggakanLain = (float) (TagihanLain::where('status', '!=', 'lunas')->selectRaw('SUM(nominal - jumlah_dibayar) as total')->value('total') ?? 0);

        return [
            'terkumpul_bulan_ini' => $terkumpulSpp + $terkumpulLain,
            'total_tunggakan' => $tunggakanSpp + $tunggakanLain,
        ];
    }

    private function kepegawaian(): array
    {
        return [
            'guru' => Teacher::count(),
            'tu' => User::where('role', 'tu')->count(),
            'staff_lain' => User::whereIn('role', [
                'pustakawan', 'bk', 'kepala_bengkel', 'teknisi',
                'waka', 'waka_kesiswaan', 'waka_kurikulum', 'waka_humas', 'waka_sarpras',
            ])->count(),
        ];
    }

    private function ppdb(): array
    {
        $counts = PpdbPendaftar::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return [
            'total' => (int) $counts->sum(),
            'mendaftar' => (int) ($counts['mendaftar'] ?? 0),
            'verifikasi' => (int) ($counts['verifikasi'] ?? 0),
            'diterima' => (int) ($counts['diterima'] ?? 0),
            'ditolak' => (int) ($counts['ditolak'] ?? 0),
        ];
    }
}
