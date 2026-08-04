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
     * Kolom "password" sengaja TIDAK disertakan — semua guru dibuat dengan
     * password default "123456" (wajib diganti saat login pertama). Kalau
     * mau tetap set password sendiri per guru, boleh tambahkan kembali kolom
     * "password" secara manual — sistem tetap membacanya kalau ada.
     */
    public function array(): array
    {
        return [
            ['Contoh Nama Guru', 'guru1@sekolah.sch.id', '198501012010011001'],
        ];
    }

    /**
     * Nama kolom di baris pertama (harus persis sama dengan yang dibaca saat import).
     */
    public function headings(): array
    {
        return ['nama', 'email', 'nip'];
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
