<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class WaliTemplateExport implements FromArray, WithHeadings, WithStyles
{
    public function array(): array
    {
        return [
            ['Contoh Nama Wali', '081234567890', '123456', '2025010001', 'Ayah'],
            ['Contoh Nama Wali', '081234567890', '', '2025010002', 'Ayah'],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'no_hp', 'password', 'nis_siswa', 'hubungan'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
