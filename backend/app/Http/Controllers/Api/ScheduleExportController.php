<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\PeriodTemplate;
use App\Models\Schedule;
use App\Models\Setting;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
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
        $schedules = Schedule::with('teacher.user')->where('tahun_ajaran_id', $tahunAjaranId)->get();

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

        $assignments = TeachingAssignment::with(['teacher.user', 'subject'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->get();
        $this->tulisKeteranganKodeGuruExcel($spreadsheet, $assignments);
        $this->tulisJpGuruPerKelasExcel($spreadsheet, $classes, $schedules);
        $spreadsheet->setActiveSheetIndex(0);

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

    /**
     * Sheet tambahan: penjelasan tiap Kode Guru (kode -> nama guru & mata
     * pelajaran) — sama seperti tabel "Keterangan Kode Guru" di menu Jadwal
     * Pelajaran, supaya dokumen yang dicetak tetap bisa dibaca tanpa perlu
     * buka aplikasi.
     */
    private function tulisKeteranganKodeGuruExcel(Spreadsheet $spreadsheet, $assignments): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Keterangan Kode Guru');

        $sheet->setCellValue('A1', 'KODE GURU');
        $sheet->setCellValue('B1', 'NAMA GURU');
        $sheet->setCellValue('C1', 'MATA PELAJARAN');
        $headerStyle = $sheet->getStyle('A1:C1');
        $headerStyle->getFont()->setBold(true);
        $headerStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFDDE6F5');
        $headerStyle->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $baris = 2;
        $terurut = $assignments->filter(fn ($a) => $a->kode_guru)->sortBy('kode_guru')->values();
        foreach ($terurut as $a) {
            $sheet->setCellValue("A{$baris}", $a->kode_guru);
            $sheet->setCellValue("B{$baris}", $a->teacher?->user?->name ?? '-');
            $sheet->setCellValue("C{$baris}", $a->subject?->nama ?? '-');
            $sheet->getStyle("A{$baris}:C{$baris}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $baris++;
        }

        $sheet->getColumnDimension('A')->setWidth(12);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(32);
    }

    /**
     * Sheet tambahan: matriks JP tiap guru per kelas + total keseluruhannya
     * — sama seperti tabel "JP Guru per Kelas" di menu Jadwal Pelajaran.
     * 1 baris per (guru, kelas); kolom "Total Jp" digabung (merge) untuk
     * guru yang mengajar di lebih dari 1 kelas.
     */
    private function tulisJpGuruPerKelasExcel(Spreadsheet $spreadsheet, $classes, $schedules): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('JP Guru per Kelas');

        $sheet->setCellValue('A1', 'NAMA');
        $kol = 2;
        foreach ($classes as $c) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . '1', strtoupper($c->name));
            $kol++;
        }
        $kolTotal = $kol;
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolTotal) . '1', 'TOTAL');
        $kolTotalJp = $kolTotal + 1;
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolTotalJp) . '1', 'TOTAL JP');

        $totalKolom = $kolTotalJp;
        $headerRange = 'A1:' . Coordinate::stringFromColumnIndex($totalKolom) . '1';
        $headerStyle = $sheet->getStyle($headerRange);
        $headerStyle->getFont()->setBold(true);
        $headerStyle->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFDDE6F5');
        $headerStyle->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $headerStyle->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $perGuruKelas = [];
        $totalPerGuru = [];
        foreach ($schedules as $s) {
            $guru = $s->teacher?->user?->name ?? 'Belum ada guru';
            $key = $guru . '||' . $s->class_room_id;
            $perGuruKelas[$key] = ($perGuruKelas[$key] ?? 0) + 1;
            $totalPerGuru[$guru] = ($totalPerGuru[$guru] ?? 0) + 1;
        }

        $daftarGuru = array_keys($totalPerGuru);
        sort($daftarGuru, SORT_STRING | SORT_FLAG_CASE);

        $baris = 2;
        foreach ($daftarGuru as $guru) {
            $kelasUntukGuru = $classes->filter(fn ($c) => isset($perGuruKelas["{$guru}||{$c->id}"]))->values();
            $barisAwalGuru = $baris;

            foreach ($kelasUntukGuru as $c) {
                $jumlah = $perGuruKelas["{$guru}||{$c->id}"];
                $sheet->setCellValue("A{$baris}", $guru);
                $kolCek = 2;
                foreach ($classes as $cc) {
                    if ($cc->id === $c->id) {
                        $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolCek) . $baris, $jumlah);
                    }
                    $kolCek++;
                }
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolTotal) . $baris, $jumlah);
                $sheet->getStyle("A{$baris}:" . Coordinate::stringFromColumnIndex($totalKolom) . $baris)
                    ->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
                $baris++;
            }

            $barisAkhirGuru = $baris - 1;
            $kolTotalJpHuruf = Coordinate::stringFromColumnIndex($kolTotalJp);
            $sheet->setCellValue("{$kolTotalJpHuruf}{$barisAwalGuru}", $totalPerGuru[$guru]);
            if ($barisAkhirGuru > $barisAwalGuru) {
                $sheet->mergeCells("{$kolTotalJpHuruf}{$barisAwalGuru}:{$kolTotalJpHuruf}{$barisAkhirGuru}");
            }
            $totalJpStyle = $sheet->getStyle("{$kolTotalJpHuruf}{$barisAwalGuru}");
            $totalJpStyle->getFont()->setBold(true);
            $totalJpStyle->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        }

        $sheet->getColumnDimension('A')->setWidth(26);
        for ($k = 2; $k <= $totalKolom; $k++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($k))->setWidth(10);
        }
    }
}
