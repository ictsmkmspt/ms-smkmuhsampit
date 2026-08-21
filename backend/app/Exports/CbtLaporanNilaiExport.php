<?php

namespace App\Exports;

use App\Models\CbtExam;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Export nilai 1 ujian/latihan dari menu Laporan — $attempts sudah
 * dimuatkan relasi student.user/student.classRoom oleh controller
 * pemanggil (CbtExamController::exportNilai() / AdminCbtExamController
 * setara), export ini murni memformat jadi baris Excel.
 */
class CbtLaporanNilaiExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    public function __construct(private CbtExam $exam, private Collection $attempts)
    {
    }

    public function collection()
    {
        return $this->attempts;
    }

    public function headings(): array
    {
        return ['Nama', 'NIS', 'Kelas', 'Status', 'Skor', 'Tuntas KKM', 'Pindah Tab'];
    }

    public function map($attempt): array
    {
        $kkm = $this->exam->kkm;
        $tuntas = $attempt->status === 'submitted' && $kkm !== null
            ? ($attempt->skor >= $kkm ? 'Tuntas' : 'Belum Tuntas')
            : '-';

        return [
            $attempt->student?->user?->name,
            $attempt->student?->nis,
            $attempt->student?->classRoom?->name,
            $attempt->status === 'submitted' ? 'Selesai' : 'Mengerjakan',
            $attempt->status === 'submitted' ? $attempt->skor : '-',
            $tuntas,
            $attempt->tab_switch_count,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
