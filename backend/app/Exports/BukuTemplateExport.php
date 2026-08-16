<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BukuTemplateExport implements FromArray, WithHeadings, WithStyles
{
    public function array(): array
    {
        return [
            ['KAT-001', 'Laskar Pelangi', 'Andrea Hirata', 'Bentang Pustaka', 2005, '978-979-1227-79-3', 'Fiksi', 'R-A12', 3],
        ];
    }

    public function headings(): array
    {
        return ['kode_buku', 'judul', 'penulis', 'penerbit', 'tahun_terbit', 'isbn', 'kategori', 'rak_lokasi', 'jumlah_eksemplar'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
