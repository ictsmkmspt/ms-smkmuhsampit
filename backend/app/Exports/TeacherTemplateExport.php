<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeacherTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * Isi contoh (baris ke-2), supaya admin tahu format yang benar sebelum diisi data asli.
     */
    public function array(): array
    {
        return [
            ['Contoh Nama Guru', 'guru1@sekolah.sch.id', 'password123', '198501012010011001'],
        ];
    }

    /**
     * Nama kolom di baris pertama (harus persis sama dengan yang dibaca saat import).
     */
    public function headings(): array
    {
        return ['nama', 'email', 'password', 'nip'];
    }

    /**
     * Bikin baris judul jadi tebal, biar jelas mana baris kolom.
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
