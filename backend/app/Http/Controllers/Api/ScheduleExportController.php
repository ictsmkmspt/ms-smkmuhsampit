<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\PeriodTemplate;
use App\Models\Schedule;
use App\Models\Setting;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ScheduleExportController extends Controller
{
    private const HARI_LABEL = [
        'senin' => 'SENIN', 'selasa' => 'SELASA', 'rabu' => 'RABU',
        'kamis' => 'KAMIS', 'jumat' => "JUM'AT", 'sabtu' => 'SABTU',
    ];

    /**
     * Cetak grid jadwal ke Excel — hari dipasangkan 2 kolom berdampingan
     * (Senin kiri, Selasa kanan, dst — sisa 1 hari tampil sendiri), diikuti
     * blok tanda tangan Kepala Sekolah & Waka Kurikulum, mengikuti format
     * jadwal master yang biasa dipakai sekolah.
     */
    public function exportExcel(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
        $tahunAjaran = TahunAjaran::find($tahunAjaranId);

        $periods = PeriodTemplate::orderBy('waktu_mulai')->get()->groupBy('hari');
        $classes = ClassRoom::where('status', 'aktif')->orderBy('name')->get();
        $schedules = Schedule::where('tahun_ajaran_id', $tahunAjaranId)->get();

        // kunci cepat "period_id-class_room_id" -> kode, biar tidak query
        // ulang per sel saat membangun tabel.
        $kodePerSel = [];
        foreach ($schedules as $s) {
            $kodePerSel[$s->period_id . '-' . $s->class_room_id] = $s->kode ?: '-';
        }

        $hariUrut = array_values(array_filter(
            ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'],
            fn ($h) => isset($periods[$h]) && $periods[$h]->isNotEmpty()
        ));

        $namaSekolah = Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit');
        $logo = Setting::get('logo_sekolah', '');
        $logoPath = $logo && Storage::disk('public')->exists($logo) ? Storage::disk('public')->path($logo) : null;

        $kolomPerHari = 2 + $classes->count(); // Waktu, Jam Ke, + tiap kelas
        $kolKananMulai = $kolomPerHari + 2; // +1 kolom jarak antar pasangan hari
        $totalKolom = $kolKananMulai + $kolomPerHari - 1;
        $kolomTerakhir = Coordinate::stringFromColumnIndex($totalKolom);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Jadwal Pelajaran');

        $baris = 1;
        if ($logoPath) {
            $drawing = new Drawing();
            $drawing->setPath($logoPath);
            $drawing->setHeight(45);
            $drawing->setCoordinates('A1');
            $drawing->setOffsetX(4);
            $drawing->setOffsetY(2);
            $drawing->setWorksheet($sheet);
        }

        $sheet->setCellValue("A{$baris}", 'JADWAL PELAJARAN ' . strtoupper($namaSekolah));
        $sheet->mergeCells("A{$baris}:{$kolomTerakhir}{$baris}");
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getRowDimension($baris)->setRowHeight(22);
        $baris++;

        $sheet->setCellValue("A{$baris}", 'TAHUN PELAJARAN ' . ($tahunAjaran?->nama ?? '-'));
        $sheet->mergeCells("A{$baris}:{$kolomTerakhir}{$baris}");
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true);
        $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $baris += 2;

        // Pasangkan hari 2-2 berdampingan (kolom kiri-kanan), sisa 1 hari
        // tampil sendiri — mengikuti kebiasaan tata letak jadwal master.
        for ($i = 0; $i < count($hariUrut); $i += 2) {
            $pasangan = array_slice($hariUrut, $i, 2);
            $barisAwal = $baris;

            $akhirKiri = $this->tulisTabelHariExcel($sheet, 1, $barisAwal, $pasangan[0], $periods[$pasangan[0]], $classes, $kodePerSel);
            $akhirKanan = $barisAwal;
            if (isset($pasangan[1])) {
                $akhirKanan = $this->tulisTabelHariExcel($sheet, $kolKananMulai, $barisAwal, $pasangan[1], $periods[$pasangan[1]], $classes, $kodePerSel);
            }

            $baris = max($akhirKiri, $akhirKanan) + 1;
        }

        $this->tulisTandaTanganExcel($sheet, $baris, $totalKolom, $request);

        // Lebar kolom — sisi kiri & kanan disamakan supaya kedua tabel
        // hari terlihat seragam.
        $sheet->getColumnDimension('A')->setWidth(10);
        $sheet->getColumnDimension('B')->setWidth(7);
        for ($k = 3; $k <= $kolomPerHari; $k++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($k))->setWidth(9);
        }
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($kolomPerHari + 1))->setWidth(3);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($kolKananMulai))->setWidth(10);
        $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($kolKananMulai + 1))->setWidth(7);
        for ($k = $kolKananMulai + 2; $k <= $totalKolom; $k++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($k))->setWidth(9);
        }

        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        $namaFile = 'Jadwal-Pelajaran-' . ($tahunAjaran?->nama ? str_replace('/', '-', $tahunAjaran->nama) : 'export') . '.xlsx';
        $tempPath = storage_path('app/temp-' . uniqid() . '.xlsx');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Tulis 1 tabel hari (label hari + header kelas + baris jam) mulai dari
     * kolom & baris tertentu — dipakai 2x per pasangan hari (kiri & kanan)
     * dengan `$kolMulai` berbeda. Mengembalikan baris setelah tabel selesai,
     * supaya pemanggil tahu berapa tinggi tabel ini (bisa beda antar hari
     * kalau jumlah baris jamnya beda).
     */
    private function tulisTabelHariExcel($sheet, int $kolMulai, int $baris, string $hari, $periodsHariIni, $classes, array $kodePerSel): int
    {
        $kolomPerHari = 2 + $classes->count();
        $kolMulaiHuruf = Coordinate::stringFromColumnIndex($kolMulai);
        $kolAkhirHuruf = Coordinate::stringFromColumnIndex($kolMulai + $kolomPerHari - 1);

        $sheet->setCellValue("{$kolMulaiHuruf}{$baris}", self::HARI_LABEL[$hari] ?? strtoupper($hari));
        $sheet->mergeCells("{$kolMulaiHuruf}{$baris}:{$kolAkhirHuruf}{$baris}");
        $labelStyle = $sheet->getStyle("{$kolMulaiHuruf}{$baris}");
        $labelStyle->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $labelStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF0B1B3A');
        $labelStyle->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $baris++;

        $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolMulai) . $baris, 'WAKTU');
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolMulai + 1) . $baris, 'JAM KE-');
        $kol = $kolMulai + 2;
        foreach ($classes as $c) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . $baris, $c->name);
            $kol++;
        }
        $headerRange = "{$kolMulaiHuruf}{$baris}:{$kolAkhirHuruf}{$baris}";
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFDDE6F5');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $baris++;

        foreach ($periodsHariIni as $period) {
            $waktu = substr($period->waktu_mulai, 0, 5) . '-' . substr($period->waktu_selesai, 0, 5);
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolMulai) . $baris, $waktu);
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolMulai + 1) . $baris, $period->jam_ke ?? '');

            if ($period->tipe === 'khusus') {
                $kolKhususMulai = Coordinate::stringFromColumnIndex($kolMulai + 2);
                $sheet->setCellValue("{$kolKhususMulai}{$baris}", $period->label_khusus);
                $sheet->mergeCells("{$kolKhususMulai}{$baris}:{$kolAkhirHuruf}{$baris}");
                $khususStyle = $sheet->getStyle("{$kolKhususMulai}{$baris}:{$kolAkhirHuruf}{$baris}");
                $khususStyle->getFont()->setBold(true);
                $khususStyle->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                if ($period->warna) {
                    $khususStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF' . ltrim($period->warna, '#'));
                }
            } else {
                $kol = $kolMulai + 2;
                foreach ($classes as $c) {
                    $kode = $kodePerSel[$period->id . '-' . $c->id] ?? '';
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . $baris, $kode);
                    $kol++;
                }
            }

            $rowRange = "{$kolMulaiHuruf}{$baris}:{$kolAkhirHuruf}{$baris}";
            $sheet->getStyle($rowRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
            $sheet->getStyle($rowRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $baris++;
        }

        return $baris;
    }

    private function tulisTandaTanganExcel($sheet, int $baris, int $totalKolom, Request $request): void
    {
        $kepsekNama = $request->input('kepsek_nama', '');
        $kepsekNip = $request->input('kepsek_nip', '');
        $wakaNama = $request->input('waka_nama', '');
        $wakaNbm = $request->input('waka_nbm', '');
        $tempat = $request->input('tempat', 'Sampit');
        $tanggal = $request->input('tanggal', now()->translatedFormat('d F Y'));

        $baris++;
        $kolKiri = 'A';
        $kolKanan = Coordinate::stringFromColumnIndex(intdiv($totalKolom, 2) + 1);

        $sheet->setCellValue("{$kolKiri}{$baris}", 'Mengetahui,');
        $sheet->setCellValue("{$kolKiri}" . ($baris + 1), 'Kepala Sekolah');
        $sheet->setCellValue("{$kolKiri}" . ($baris + 5), $kepsekNama ?: '.......................................');
        $sheet->getStyle("{$kolKiri}" . ($baris + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->setCellValue("{$kolKiri}" . ($baris + 6), 'NIP. ' . ($kepsekNip ?: '.......................................'));

        $sheet->setCellValue("{$kolKanan}{$baris}", $tempat . ', ' . $tanggal);
        $sheet->setCellValue("{$kolKanan}" . ($baris + 1), 'Wakil Kepala Sekolah Bidang Kurikulum');
        $sheet->setCellValue("{$kolKanan}" . ($baris + 5), $wakaNama ?: '.......................................');
        $sheet->getStyle("{$kolKanan}" . ($baris + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->setCellValue("{$kolKanan}" . ($baris + 6), 'NBM. ' . ($wakaNbm ?: '.......................................'));
    }
}
