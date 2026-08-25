<?php

namespace App\Exports;

use App\Models\JobApplication;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Laporan penempatan kerja alumni (lamaran berstatus "diterima") — dipakai
 * Pengurus BKK melaporkan penyaluran tenaga kerja ke Disnaker (Permenaker
 * No. 39/2016 mewajibkan BKK sekolah melaporkan data penempatan).
 */
class PenempatanBkkExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function collection(): Collection
    {
        return JobApplication::with('student.user', 'student.jurusan', 'jobVacancy.iduka')
            ->where('status', 'diterima')
            ->orderByDesc('updated_at')
            ->get();
    }

    public function headings(): array
    {
        return ['Nama Alumni', 'NISN', 'Jurusan', 'Tahun Lulus', 'Perusahaan Penerima', 'Posisi', 'Tanggal Diterima'];
    }

    public function map($a): array
    {
        return [
            $a->student?->user?->name ?? '-',
            $a->student?->nisn ?? '-',
            $a->student?->jurusan?->nama ?? '-',
            $a->student?->tanggal_lulus ? \Illuminate\Support\Carbon::parse($a->student->tanggal_lulus)->format('Y') : '-',
            $a->jobVacancy?->iduka?->nama_perusahaan ?? '-',
            $a->jobVacancy?->posisi ?? '-',
            $a->updated_at?->format('d-m-Y') ?? '-',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
