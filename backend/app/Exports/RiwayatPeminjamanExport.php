<?php

namespace App\Exports;

use App\Models\PerpustakaanPeminjaman;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Laporan riwayat peminjaman buku (yang sudah selesai diproses — bukan yang
 * masih aktif dipinjam) — dipakai pengurus buat rekap ke pihak sekolah,
 * pola sama LaporanKeuanganExport (FromCollection + WithMapping).
 */
class RiwayatPeminjamanExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private ?string $start = null, private ?string $end = null)
    {
    }

    public function collection(): Collection
    {
        $query = PerpustakaanPeminjaman::with([
            'eksemplar.buku',
            // morphWith: siswa & guru butuh relasi bersarang beda (siswa
            // punya classRoom, guru tidak) — dot notation biasa error kalau
            // salah satu tipe morph tidak punya relasi yang diminta.
            'peminjam' => fn ($morphTo) => $morphTo->morphWith([
                Student::class => ['user', 'classRoom'],
                Teacher::class => ['user'],
            ]),
        ])->whereIn('status', ['dikembalikan', 'rusak', 'hilang']);

        if ($this->start && $this->end) {
            $query->whereBetween('tanggal_kembali', [$this->start, $this->end]);
        }

        return $query->orderByDesc('tanggal_kembali')->get();
    }

    public function headings(): array
    {
        return ['Judul Buku', 'Kode Eksemplar', 'Tipe Peminjam', 'Nama Peminjam', 'NIS/NIP', 'Kelas', 'Tanggal Pinjam', 'Jatuh Tempo', 'Tanggal Kembali', 'Status'];
    }

    public function map($p): array
    {
        $tipe = $p->peminjam_type === 'siswa' ? 'Siswa' : 'Guru';
        $nomorInduk = $p->peminjam instanceof Student ? $p->peminjam?->nis : $p->peminjam?->nip;

        return [
            $p->eksemplar?->buku?->judul ?? '-',
            $p->eksemplar?->kode_eksemplar ?? '-',
            $tipe,
            $p->peminjam?->user?->name ?? '-',
            $nomorInduk ?? '-',
            $p->peminjam instanceof Student ? ($p->peminjam?->classRoom?->name ?? '-') : '-',
            $p->tanggal_pinjam?->format('d-m-Y') ?? '-',
            $p->tanggal_jatuh_tempo?->format('d-m-Y') ?? '-',
            $p->tanggal_kembali?->format('d-m-Y') ?? '-',
            $p->status,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
