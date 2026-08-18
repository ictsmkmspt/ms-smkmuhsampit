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
     * yang ada di Master Data > Kelas (misal "X TKJ"). Kolom "jurusan" boleh
     * diisi KODE ATAU NAMA jurusan persis seperti di Pengaturan > Jurusan
     * (misal "TKJ" atau "Teknik Komputer & Jaringan", dua-duanya cocok) —
     * keduanya (kelas & jurusan) boleh dikosongkan. Kolom "tanggal_lahir" pakai format
     * YYYY-MM-DD. Kolom "password" sengaja TIDAK disertakan di template —
     * semua siswa dibuat dengan password default "123456" (wajib diganti
     * saat login pertama). Kalau mau tetap set password sendiri per siswa,
     * boleh tambahkan kembali kolom "password" secara manual — sistem tetap
     * membacanya kalau ada. Foto siswa TIDAK bisa diimport lewat Excel —
     * diunggah manual per siswa lewat menu Siswa.
     */
    public function array(): array
    {
        return [
            ['Contoh Nama Siswa', 'siswa1@sekolah.sch.id', '2025010001', '0012345678', 'L', 'X TKJ', 'TKJ', 'Sampit', '2009-05-17', 'Jl. Contoh No. 1, Sampit'],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'email', 'nis', 'nisn', 'jenis_kelamin', 'kelas', 'jurusan', 'tempat_lahir', 'tanggal_lahir', 'alamat'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
