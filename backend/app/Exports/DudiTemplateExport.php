<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DudiTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * Isi contoh (baris ke-2). Kolom "penanggung_jawab" dipakai juga sebagai
     * nama akun login IDUKA (sama seperti form Tambah Akun IDUKA manual).
     * Kolom "password" sengaja TIDAK disertakan di template — semua akun
     * dibuat dengan password default "123456" (wajib diganti saat login
     * pertama). Kolom "radius_meter" boleh dikosongkan, default 100 meter.
     */
    public function array(): array
    {
        return [
            ['PT Contoh Industri Kreatif', 'Jl. Contoh No. 1, Sampit', 'Nama Instruktur', '081234567890', '-2.5407600', '112.9502900', '100'],
        ];
    }

    public function headings(): array
    {
        return ['nama_perusahaan', 'alamat', 'penanggung_jawab', 'telepon', 'latitude', 'longitude', 'radius_meter'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
