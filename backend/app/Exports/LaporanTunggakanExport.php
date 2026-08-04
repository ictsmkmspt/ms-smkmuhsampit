<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LaporanTunggakanExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * @param array $data Hasil dari LaporanController::tunggakan() (sudah dalam bentuk array biasa).
     */
    public function __construct(private array $data)
    {
    }

    public function array(): array
    {
        return array_map(fn ($row) => [
            $row['student']['user']['name'] ?? '-',
            $row['student']['nis'] ?? '-',
            $row['student']['class_room']['name'] ?? '-',
            (int) $row['tunggakan_spp'],
            (int) $row['tunggakan_lain'],
            (int) $row['total_tunggakan'],
        ], $this->data);
    }

    public function headings(): array
    {
        return ['Nama Siswa', 'NIS', 'Kelas', 'Tunggakan SPP', 'Tunggakan Tagihan Lain', 'Total Tunggakan'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
