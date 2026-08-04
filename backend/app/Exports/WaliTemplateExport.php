<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class WaliTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * Kolom "password" sengaja TIDAK disertakan di template — wali dibuat
     * dengan password default "123456" (wajib diganti saat login pertama).
     * Kalau mau tetap set password sendiri per wali, boleh tambahkan kembali
     * kolom "password" secara manual — sistem tetap membacanya kalau ada.
     */
    public function array(): array
    {
        return [
            ['Contoh Nama Wali', '081234567890', '2025010001', 'Ayah'],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'no_hp', 'nis_siswa', 'hubungan'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
