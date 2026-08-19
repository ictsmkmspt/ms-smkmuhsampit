<?php

namespace App\Exports;

use App\Models\SppPembayaran;
use App\Models\TagihanLainPembayaran;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LaporanKeuanganExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private string $start, private string $end)
    {
    }

    /**
     * Gabungan rincian pembayaran SPP + Tagihan Lain dalam 1 rentang tanggal,
     * diurutkan berdasarkan tanggal bayar — supaya jadi 1 daftar transaksi
     * kronologis di file Excel-nya. Sumbernya riwayat pembayaran (ledger),
     * BUKAN baris tagihan induk — nominal jumlah_dibayar/tanggal_bayar di
     * induk cuma cache akumulasi TERBARU, jadi query langsung ke induk
     * salah mengelompokkan cicilan lintas bulan ke bulan pembayaran
     * TERAKHIR saja.
     */
    public function collection(): Collection
    {
        $spp = SppPembayaran::with(['spp.student.user', 'spp.student.classRoom'])
            ->whereBetween('tanggal_bayar', [$this->start, $this->end])
            ->get()
            ->map(fn ($p) => [
                'tanggal' => $p->tanggal_bayar->format('d-m-Y'),
                'jenis' => 'SPP',
                'keterangan' => 'SPP ' . $this->namaBulan($p->spp->bulan) . ' ' . $p->spp->tahun,
                'student' => $p->spp->student,
                'jumlah_dibayar' => $p->jumlah,
            ]);

        $lain = TagihanLainPembayaran::with(['tagihanLain.student.user', 'tagihanLain.student.classRoom'])
            ->whereBetween('tanggal_bayar', [$this->start, $this->end])
            ->get()
            ->map(fn ($p) => [
                'tanggal' => $p->tanggal_bayar->format('d-m-Y'),
                'jenis' => 'Tagihan Lain',
                'keterangan' => $p->tagihanLain->nama_tagihan,
                'student' => $p->tagihanLain->student,
                'jumlah_dibayar' => $p->jumlah,
            ]);

        return $spp->concat($lain)->sortBy('tanggal')->values();
    }

    private function namaBulan(int $bulan): string
    {
        $nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return $nama[$bulan - 1] ?? (string) $bulan;
    }

    public function headings(): array
    {
        return ['Tanggal Bayar', 'Nama Siswa', 'Kelas', 'Jenis', 'Keterangan', 'Jumlah Dibayar'];
    }

    public function map($row): array
    {
        return [
            $row['tanggal'],
            $row['student']->user->name ?? '-',
            $row['student']->classRoom->name ?? '-',
            $row['jenis'],
            $row['keterangan'],
            (int) $row['jumlah_dibayar'],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
