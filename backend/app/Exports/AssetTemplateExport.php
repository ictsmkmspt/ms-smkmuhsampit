<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AssetTemplateExport implements FromArray, WithHeadings, WithStyles
{
    /**
     * Urutan kolom persis mengikuti Kartu Inventaris Ruangan (KIR) resmi:
     * Nama, Merk/Model, No. Seri Pabrik, Ukuran, Bahan, Tahun
     * Pembuatan/Pembelian, No. Kode Barang, lalu jumlah per kondisi
     * (Baik/Rusak Ringan/Rusak Berat) — cuma "ruang" & "keterangan" yang
     * ditambahkan di luar kolom KIR (perlu buat sistem ini, bukan bagian
     * kolom resminya). Kolom "ruang" diisi NAMA ruang persis seperti di
     * Master Data > Ruang (misal "Laboratorium TKJ"), boleh dikosongkan.
     * Jumlah per kondisi boleh dikosongkan yang tidak relevan; kalau
     * ketiganya kosong dianggap 1 barang kondisi Baik. Kolom
     * "tanggal_perolehan" boleh diisi tahun saja (mis. "2017") kalau
     * tanggal pastinya tidak diketahui, sama seperti KIR kertas biasanya.
     */
    public function array(): array
    {
        return [
            ['Meja Besar', '', '', '', 'Kayu', '2017', '024/A/TEFATKJ/SMKM/XII/2017', 13, '', '', 'Laboratorium TKJ', ''],
        ];
    }

    public function headings(): array
    {
        return ['nama', 'merk_model', 'no_seri_pabrik', 'ukuran', 'bahan', 'tanggal_perolehan', 'kode_barang', 'jumlah_baik', 'jumlah_rusak_ringan', 'jumlah_rusak_berat', 'ruang', 'keterangan'];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
