<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Template import alumni — kolom sengaja diminimalkan (nama, nis, jurusan,
 * tanggal_lulus) buat catat lulusan lama yang datanya seadanya. TANPA
 * kolom "kelas" (beda dari StudentTemplateExport) karena semua baris
 * masuk ke 1 kelas alumni yang sudah dipilih sebelum upload. Kolom
 * "jurusan" boleh kode ATAU nama persis seperti di Pengaturan > Jurusan,
 * boleh dikosongkan. Kolom "tanggal_lulus" boleh YYYY-MM-DD atau
 * DD/MM/YYYY, kalau dikosongkan otomatis diisi tanggal hari ini saat
 * diimport.
 */
class AlumniTemplateExport implements FromArray, WithHeadings, WithStyles
{
    public function array(): array
    {
        return [
            ['Contoh Nama Alumni', '2019010001', 'TKJ', '18/06/2022'],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'nis', 'jurusan', 'tanggal_lulus'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
