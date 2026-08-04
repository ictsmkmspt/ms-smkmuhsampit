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
     * kalau siswa belum mau dimasukkan ke kelas manapun. Kolom "password"
     * sengaja TIDAK disertakan di template — semua siswa dibuat dengan
     * password default "123456" (wajib diganti saat login pertama). Kalau
     * mau tetap set password sendiri per siswa, boleh tambahkan kembali
     * kolom "password" secara manual — sistem tetap membacanya kalau ada.
     */
    public function array(): array
    {
        return [
            ['Contoh Nama Siswa', 'siswa1@sekolah.sch.id', '2025010001', 'L', 'X TKJ'],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'email', 'nis', 'jenis_kelamin', 'kelas'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
