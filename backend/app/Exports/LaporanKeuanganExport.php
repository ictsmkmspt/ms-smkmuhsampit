<?php

namespace App\Exports;

use App\Models\Spp;
use App\Models\TagihanLain;
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
     * kronologis di file Excel-nya.
     */
    public function collection(): Collection
    {
        $spp = Spp::with(['student.user', 'student.classRoom'])
            ->whereBetween('tanggal_bayar', [$this->start, $this->end])
            ->where('jumlah_dibayar', '>', 0)
            ->get()
            ->map(fn ($s) => [
                'tanggal' => $s->tanggal_bayar,
                'jenis' => 'SPP',
                'keterangan' => 'SPP ' . $this->namaBulan($s->bulan) . ' ' . $s->tahun,
                'model' => $s,
                'jumlah_dibayar' => $s->jumlah_dibayar,
            ]);

        $lain = TagihanLain::with(['student.user', 'student.classRoom'])
            ->whereBetween('tanggal_bayar', [$this->start, $this->end])
            ->where('jumlah_dibayar', '>', 0)
            ->get()
            ->map(fn ($t) => [
                'tanggal' => $t->tanggal_bayar,
                'jenis' => 'Tagihan Lain',
                'keterangan' => $t->nama_tagihan,
                'model' => $t,
                'jumlah_dibayar' => $t->jumlah_dibayar,
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
            $row['model']->student->user->name ?? '-',
            $row['model']->student->classRoom->name ?? '-',
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
