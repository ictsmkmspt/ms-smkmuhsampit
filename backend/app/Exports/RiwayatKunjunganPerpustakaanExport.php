<?php

namespace App\Exports;

use App\Models\PerpustakaanKunjungan;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Laporan riwayat kunjungan Perpustakaan — pola sama persis
 * RiwayatPeminjamanExport (FromCollection + WithMapping), cuma beda
 * sumber tabel & kolom.
 */
class RiwayatKunjunganPerpustakaanExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private ?string $start = null, private ?string $end = null)
    {
    }

    public function collection(): Collection
    {
        $query = PerpustakaanKunjungan::with([
            // morphWith: siswa & guru butuh relasi bersarang beda (siswa
            // punya classRoom, guru tidak) — dot notation biasa error kalau
            // salah satu tipe morph tidak punya relasi yang diminta.
            'pengunjung' => fn ($morphTo) => $morphTo->morphWith([
                Student::class => ['user', 'classRoom'],
                Teacher::class => ['user'],
            ]),
            'dicatatOleh',
        ]);

        if ($this->start && $this->end) {
            $query->whereBetween('tanggal', [$this->start, $this->end]);
        }

        return $query->orderByDesc('tanggal')->orderByDesc('created_at')->get();
    }

    public function headings(): array
    {
        return ['Tanggal', 'Tipe Pengunjung', 'Nama Pengunjung', 'NIS/NIP', 'Kelas', 'Keperluan', 'Dicatat Oleh'];
    }

    public function map($k): array
    {
        $tipe = $k->pengunjung_type === 'siswa' ? 'Siswa' : 'Guru';
        $nomorInduk = $k->pengunjung instanceof Student ? $k->pengunjung?->nis : $k->pengunjung?->nip;

        return [
            $k->tanggal?->format('d-m-Y') ?? '-',
            $tipe,
            $k->pengunjung?->user?->name ?? '-',
            $nomorInduk ?? '-',
            $k->pengunjung instanceof Student ? ($k->pengunjung?->classRoom?->name ?? '-') : '-',
            $k->keperluan,
            $k->dicatatOleh?->name ?? '-',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
