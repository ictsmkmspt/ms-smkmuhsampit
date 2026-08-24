<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class IdukaTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * Isi contoh (baris ke-2). Kolom "nama_instruktur" dipakai sebagai nama
     * akun login Instruktur (sama seperti form Tambah Instruktur manual).
     * Kolom "email" opsional — kalau diisi, akun bisa login pakai email
     * ini juga (selain no HP), disiapkan untuk login ke fitur BKK nanti.
     * Kolom "password" sengaja TIDAK disertakan di template — semua akun
     * dibuat dengan password default "123456" (wajib diganti saat login
     * pertama). Kolom "radius_meter" boleh dikosongkan, default 100 meter.
     */
    public function array(): array
    {
        return [
            ['PT Contoh Industri Kreatif', 'Jl. Contoh No. 1, Sampit', 'Nama Instruktur', '081234567890', '', '-2.5407600', '112.9502900', '100'],
        ];
    }

    public function headings(): array
    {
        return ['nama_perusahaan', 'alamat', 'nama_instruktur', 'telepon', 'email', 'latitude', 'longitude', 'radius_meter'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
