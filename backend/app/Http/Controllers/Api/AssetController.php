<?php

namespace App\Http\Controllers\Api;

use App\Exports\AssetTemplateExport;
use App\Http\Controllers\Api\Concerns\RestrictsToOwnRoom;
use App\Http\Controllers\Controller;
use App\Imports\AssetsImport;
use App\Models\Asset;
use App\Models\Room;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AssetController extends Controller
{
    use RestrictsToOwnRoom;

    public function index(Request $request)
    {
        $query = Asset::with('room')->orderBy('nama');

        $roomId = $this->ownRoomId($request);
        if ($roomId !== null) {
            $query->where('room_id', $roomId);
        } elseif ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        return $query->get();
    }

    /**
     * Cari aset berdasarkan kode hasil pindai QR — kode dikirim lewat query
     * string (?code=...), bukan segmen URL, karena kode aset boleh bebas
     * (termasuk mengandung "/") dan segmen URL akan merusak kode semacam
     * itu (mis. "INV/26/00001" jadi terpotong sebagai 3 segmen path).
     */
    public function findByQrCode(Request $request)
    {
        $code = (string) $request->query('code');
        $query = Asset::with('room')->where('kode_aset', $code);

        $roomId = $this->ownRoomId($request);
        if ($roomId !== null) {
            $query->where('room_id', $roomId);
        }

        $asset = $query->first();

        if (!$asset) {
            return response()->json([
                'message' => 'QR tidak dikenali / aset tidak ditemukan.',
            ], 404);
        }

        return response()->json($asset);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'merk_model' => 'nullable|string|max:100',
            'no_seri_pabrik' => 'nullable|string|max:100',
            'ukuran' => 'nullable|string|max:100',
            'bahan' => 'nullable|string|max:100',
            'tanggal_perolehan' => 'nullable|date',
            'kode_aset' => 'required|string|max:50|unique:assets,kode_aset',
            'jumlah_baik' => 'nullable|integer|min:0',
            'jumlah_rusak_ringan' => 'nullable|integer|min:0',
            'jumlah_rusak_berat' => 'nullable|integer|min:0',
            'room_id' => 'nullable|exists:rooms,id',
            'keterangan' => 'nullable|string',
        ]);
        $this->pastikanAdaJumlah($data);

        $roomId = $this->ownRoomId($request);
        if ($roomId !== null) {
            $data['room_id'] = $roomId;
        }

        return response()->json(Asset::create($data)->load('room'), 201);
    }

    public function update(Request $request, Asset $asset)
    {
        $roomId = $this->ownRoomId($request);
        if ($roomId !== null && $asset->room_id !== $roomId) {
            abort(403, 'Aset ini bukan tanggung jawab ruang Anda.');
        }

        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'merk_model' => 'nullable|string|max:100',
            'no_seri_pabrik' => 'nullable|string|max:100',
            'ukuran' => 'nullable|string|max:100',
            'bahan' => 'nullable|string|max:100',
            'tanggal_perolehan' => 'nullable|date',
            'kode_aset' => 'required|string|max:50|unique:assets,kode_aset,' . $asset->id,
            'jumlah_baik' => 'nullable|integer|min:0',
            'jumlah_rusak_ringan' => 'nullable|integer|min:0',
            'jumlah_rusak_berat' => 'nullable|integer|min:0',
            'room_id' => 'nullable|exists:rooms,id',
            'keterangan' => 'nullable|string',
        ]);
        $this->pastikanAdaJumlah($data);

        if ($roomId !== null) {
            $data['room_id'] = $roomId;
        }

        $asset->update($data);

        return $asset->fresh('room');
    }

    /**
     * Total ketiga kondisi minimal 1 — aset dengan jumlah 0 di semua
     * kondisi tidak masuk akal buat dicatat.
     */
    private function pastikanAdaJumlah(array $data): void
    {
        $total = ($data['jumlah_baik'] ?? 0) + ($data['jumlah_rusak_ringan'] ?? 0) + ($data['jumlah_rusak_berat'] ?? 0);
        if ($total < 1) {
            abort(422, 'Isi jumlah minimal 1 di salah satu kondisi (Baik/Rusak Ringan/Rusak Berat).');
        }
    }

    public function destroy(Asset $asset)
    {
        if ($asset->maintenanceRequests()->exists()) {
            return response()->json(['message' => 'Aset ini masih punya riwayat pemeliharaan, tidak bisa dihapus.'], 422);
        }

        $asset->delete();

        return response()->json(['message' => 'Data aset dihapus.']);
    }

    /**
     * Download file Excel (.xlsx) kosong berisi contoh format kolom untuk import data aset.
     * Isi datanya, lalu upload lewat fitur Import.
     */
    public function downloadTemplate()
    {
        return Excel::download(new AssetTemplateExport, 'template_import_aset.xlsx');
    }

    /**
     * Import banyak aset sekaligus dari file Excel yang diupload. Kepala
     * Bengkel dipaksa import ke ruang tanggung jawabnya sendiri (lihat
     * AssetsImport); Admin/Waka Sarpras pakai kolom "ruang" di file.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $import = new AssetsImport($this->ownRoomId($request));
        Excel::import($import, $request->file('file'));

        $gagal = [];
        foreach ($import->failures() as $failure) {
            $gagal[] = [
                'baris' => $failure->row(),
                'kolom' => $failure->attribute(),
                'alasan' => implode(' ', $failure->errors()),
            ];
        }

        return response()->json([
            'message' => $import->successCount . ' aset berhasil diimport, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal' => $gagal,
        ]);
    }

    /**
     * Export Kartu Inventaris Ruangan (KIR) 1 ruang ke Excel, meniru
     * format resmi KIR (kolom bernomor 1-9, 11-14 — nomor 10 memang
     * dilewati, ikut template aslinya). jumlah_baik/rusak_ringan/rusak_berat
     * ditulis langsung ke kolom B/KB/RB masing-masing, jadi barang sejenis
     * dengan kondisi campuran tetap 1 baris — persis kertas KIR aslinya.
     */
    public function exportKir(Request $request)
    {
        $roomId = $this->ownRoomId($request);
        if ($roomId === null) {
            $request->validate(['room_id' => 'required|exists:rooms,id']);
            $roomId = $request->room_id;
        }
        $room = Room::findOrFail($roomId);

        $data = $request->validate([
            'provinsi' => 'nullable|string|max:100',
            'kabupaten' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:150',
            'tanggal' => 'nullable|string|max:30',
            'kepala_ruang_nama' => 'nullable|string|max:100',
            'kepala_ruang_nbm' => 'nullable|string|max:50',
            'waka_sarpras_nama' => 'nullable|string|max:100',
            'waka_sarpras_nbm' => 'nullable|string|max:50',
        ]);

        $assets = Asset::where('room_id', $room->id)->orderBy('id')->get();
        $namaSekolah = Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit');
        $logo = Setting::get('logo_sekolah', '');
        $logoPath = $logo && Storage::disk('public')->exists($logo) ? Storage::disk('public')->path($logo) : null;

        $kolom = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
        $nomorKolom = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '12', '13', '14'];

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('KIR');

        $baris = 1;
        if ($logoPath) {
            $drawing = new Drawing();
            $drawing->setPath($logoPath);
            $drawing->setHeight(50);
            $drawing->setCoordinates('A1');
            $drawing->setOffsetX(4);
            $drawing->setOffsetY(2);
            $drawing->setWorksheet($sheet);
        }

        $sheet->setCellValue("A{$baris}", strtoupper($namaSekolah));
        $sheet->mergeCells("A{$baris}:M{$baris}");
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $baris++;

        $sheet->setCellValue("A{$baris}", 'KARTU INVENTARIS RUANGAN');
        $sheet->mergeCells("A{$baris}:M{$baris}");
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true);
        $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $baris += 2;

        $identitas = [
            'PROVINSI' => $data['provinsi'] ?? '',
            'KABUPATEN' => $data['kabupaten'] ?? '',
            'UNIT' => ($data['unit'] ?? '') ?: $namaSekolah,
            'NAMA RUANGAN' => strtoupper($room->nama),
        ];
        if ($room->kode_ruangan) {
            $identitas['KODE RUANGAN'] = $room->kode_ruangan;
        }
        foreach ($identitas as $label => $nilai) {
            $sheet->setCellValue("A{$baris}", $label);
            $sheet->setCellValue("C{$baris}", ': ' . $nilai);
            $sheet->getStyle("A{$baris}")->getFont()->setBold(true);
            $baris++;
        }
        $baris++;

        // Header 3 baris: label kolom (rowspan A-I & M, "Keadaan Barang"
        // merge J:L di baris 1), sub-label B/KB/RB di baris 2, nomor kolom
        // resmi (1-9, 11-14) di baris 3 — persis format KIR aslinya.
        $barisHeaderAwal = $baris;
        $label = [
            'A' => 'No. Urut', 'B' => "Jenis Barang/\nNama Barang", 'C' => "Merk/\nModel",
            'D' => 'No. Seri Pabrik', 'E' => 'Ukuran', 'F' => 'Bahan',
            'G' => "Tahun Pembuatan/\nTahun Pembelian", 'H' => 'No. Kode Barang',
            'I' => "Jumlah Barang/\nRegister", 'M' => 'Ket. Mutasi dll',
        ];
        foreach ($label as $kol => $teks) {
            $sheet->setCellValue("{$kol}{$baris}", $teks);
            $sheet->mergeCells("{$kol}{$baris}:{$kol}" . ($baris + 2));
        }
        $sheet->setCellValue("J{$baris}", 'Keadaan Barang');
        $sheet->mergeCells("J{$baris}:L{$baris}");
        $baris++;

        $sheet->setCellValue("J{$baris}", "Baik (B) dll");
        $sheet->setCellValue("K{$baris}", "Kurang Baik\n(KB)");
        $sheet->setCellValue("L{$baris}", "Rusak Berat\n(RB)");
        $baris++;

        foreach ($kolom as $i => $kol) {
            $sheet->setCellValue("{$kol}{$baris}", $nomorKolom[$i]);
        }
        $baris++;

        $headerRange = "A{$barisHeaderAwal}:M" . ($baris - 1);
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFDDE6F5');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);
        $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        foreach ($assets as $i => $a) {
            $tahun = $a->tanggal_perolehan ? \Carbon\Carbon::parse($a->tanggal_perolehan)->year : '';
            $sheet->setCellValue("A{$baris}", $i + 1);
            $sheet->setCellValue("B{$baris}", $a->nama);
            $sheet->setCellValue("C{$baris}", $a->merk_model);
            $sheet->setCellValue("D{$baris}", $a->no_seri_pabrik);
            $sheet->setCellValue("E{$baris}", $a->ukuran);
            $sheet->setCellValue("F{$baris}", $a->bahan);
            $sheet->setCellValue("G{$baris}", $tahun);
            $sheet->setCellValue("H{$baris}", $a->kode_aset);
            $sheet->setCellValue("I{$baris}", $a->jumlah);
            if ($a->jumlah_baik > 0) {
                $sheet->setCellValue("J{$baris}", $a->jumlah_baik);
            }
            if ($a->jumlah_rusak_ringan > 0) {
                $sheet->setCellValue("K{$baris}", $a->jumlah_rusak_ringan);
            }
            if ($a->jumlah_rusak_berat > 0) {
                $sheet->setCellValue("L{$baris}", $a->jumlah_rusak_berat);
            }
            $sheet->setCellValue("M{$baris}", $a->keterangan);

            $rowRange = "A{$baris}:M{$baris}";
            $sheet->getStyle($rowRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("G{$baris}:L{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $baris++;
        }
        if ($assets->isEmpty()) {
            $sheet->setCellValue("A{$baris}", 'Belum ada data aset di ruang ini.');
            $sheet->mergeCells("A{$baris}:M{$baris}");
            $baris++;
        }
        $baris += 2;

        $this->tulisTandaTanganKirExcel($sheet, $baris, $room, $data);

        $sheet->getColumnDimension('A')->setWidth(6);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(14);
        $sheet->getColumnDimension('D')->setWidth(16);
        $sheet->getColumnDimension('E')->setWidth(10);
        $sheet->getColumnDimension('F')->setWidth(10);
        $sheet->getColumnDimension('G')->setWidth(12);
        $sheet->getColumnDimension('H')->setWidth(24);
        $sheet->getColumnDimension('I')->setWidth(10);
        foreach (['J', 'K', 'L'] as $kol) {
            $sheet->getColumnDimension($kol)->setWidth(9);
        }
        $sheet->getColumnDimension('M')->setWidth(14);

        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        $namaFile = 'KIR-' . str_replace(' ', '-', $room->nama) . '.xlsx';
        $tempPath = storage_path('app/temp-' . uniqid() . '.xlsx');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Blok tanda tangan 2 kolom (Waka Sarpras / Kepala Ruangan) — sama
     * seperti dokumen resmi lain, nama-nama ini diisi manual dari form
     * export lalu tersimpan di localStorage sisi frontend supaya tidak
     * perlu diketik ulang tiap ekspor.
     */
    private function tulisTandaTanganKirExcel($sheet, int $baris, Room $room, array $data): void
    {
        $tempat = 'Sampit';
        $tanggal = $data['tanggal'] ?? now()->translatedFormat('d F Y');
        $wakaNama = $data['waka_sarpras_nama'] ?? '';
        $wakaNbm = $data['waka_sarpras_nbm'] ?? '';
        $kepalaNama = $data['kepala_ruang_nama'] ?? '';
        $kepalaNbm = $data['kepala_ruang_nbm'] ?? '';

        $sheet->setCellValue("L{$baris}", $tempat . ', ' . $tanggal);
        $sheet->mergeCells("L{$baris}:M{$baris}");
        $baris++;

        $sheet->setCellValue("A{$baris}", 'MENGETAHUI :');
        $baris++;

        $sheet->setCellValue("A{$baris}", 'WAKA SARPRAS ' . strtoupper($this->namaSekolahSingkat()));
        $sheet->mergeCells("A{$baris}:F{$baris}");
        $sheet->setCellValue("H{$baris}", 'KEPALA ' . strtoupper($room->nama));
        $sheet->mergeCells("H{$baris}:M{$baris}");
        $baris += 5;

        $sheet->setCellValue("A{$baris}", $wakaNama ?: '.......................................');
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true)->setUnderline(true);
        $sheet->setCellValue("H{$baris}", $kepalaNama ?: '.......................................');
        $sheet->getStyle("H{$baris}")->getFont()->setBold(true)->setUnderline(true);
        $baris++;

        $sheet->setCellValue("A{$baris}", 'NBM. ' . ($wakaNbm ?: '.......................................'));
        $sheet->setCellValue("H{$baris}", 'NBM. ' . ($kepalaNbm ?: '.......................................'));
    }

    private function namaSekolahSingkat(): string
    {
        return Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit');
    }
}
