<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CbtQuestionTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * 2 baris contoh — 1 pilihan ganda, 1 essay — supaya guru langsung
     * lihat kolom mana yang wajib diisi untuk tiap tipe soal. pilihan_e
     * boleh dikosongkan kalau soalnya cuma 4 pilihan.
     */
    public function array(): array
    {
        return [
            ['pg', 'Ibu kota Indonesia adalah?', 'Jakarta', 'Bandung', 'Surabaya', 'Medan', '', 'A', 'mudah'],
            ['essay', 'Jelaskan proses terjadinya hujan.', '', '', '', '', '', '', 'sulit'],
        ];
    }

    public function headings(): array
    {
        return ['tipe', 'pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'pilihan_e', 'jawaban_benar', 'tingkat_kesulitan'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
