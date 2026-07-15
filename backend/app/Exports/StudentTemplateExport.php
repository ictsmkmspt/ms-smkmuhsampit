<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StudentTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * Isi contoh (baris ke-2). Kolom "kelas" diisi NAMA kelas persis seperti
     * yang ada di Master Data > Kelas (misal "X TKJ"), boleh dikosongkan
     * kalau siswa belum mau dimasukkan ke kelas manapun.
     */
    public function array(): array
    {
        return [
            ['Contoh Nama Siswa', 'siswa1@sekolah.sch.id', 'password123', '2025010001', 'X TKJ'],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'email', 'password', 'nis', 'kelas'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
