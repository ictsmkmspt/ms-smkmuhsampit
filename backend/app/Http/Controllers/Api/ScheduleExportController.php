<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\Period;
use App\Models\Schedule;
use App\Models\Setting;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

class ScheduleExportController extends Controller
{
    private const HARI_LABEL = [
        'senin' => 'SENIN', 'selasa' => 'SELASA', 'rabu' => 'RABU',
        'kamis' => 'KAMIS', 'jumat' => "JUM'AT", 'sabtu' => 'SABTU',
    ];

    /**
     * Cetak grid jadwal ke Word — strukturnya (hari berdampingan 2 kolom,
     * baris kegiatan khusus membentang penuh, blok tanda tangan) mengikuti
     * format jadwal master yang biasa dipakai sekolah, bukan tiruan
     * pixel-per-pixel dari dokumen manapun.
     */
    public function exportWord(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
        $tahunAjaran = TahunAjaran::find($tahunAjaranId);

        $periods = Period::where('tahun_ajaran_id', $tahunAjaranId)
            ->orderBy('waktu_mulai')->get()->groupBy('hari');
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

        $phpWord = new PhpWord();
        $section = $phpWord->addSection([
            'orientation' => 'landscape',
            'marginTop' => 500, 'marginBottom' => 500, 'marginLeft' => 500, 'marginRight' => 500,
        ]);

        $namaSekolah = Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit');
        $logo = Setting::get('logo_sekolah', '');
        $logoPath = $logo && Storage::disk('public')->exists($logo) ? Storage::disk('public')->path($logo) : null;

        $headerTable = $section->addTable(['cellMargin' => 0]);
        $headerTable->addRow();
        $logoCell = $headerTable->addCell(1200);
        if ($logoPath) {
            $logoCell->addImage($logoPath, ['width' => 55, 'height' => 55]);
        }
        $judulCell = $headerTable->addCell(13500);
        $judulCell->addText('JADWAL PELAJARAN ' . strtoupper($namaSekolah), ['bold' => true, 'size' => 14], ['alignment' => Jc::CENTER]);
        $judulCell->addText('TAHUN PELAJARAN ' . ($tahunAjaran?->nama ?? '-'), ['bold' => true, 'size' => 12], ['alignment' => Jc::CENTER]);
        $headerTable->addCell(1200);
        $section->addTextBreak(1);

        // Pasangkan hari 2-2 berdampingan (kolom kiri-kanan), sisa 1 hari
        // tampil sendiri — mengikuti kebiasaan tata letak jadwal master.
        for ($i = 0; $i < count($hariUrut); $i += 2) {
            $pasangan = array_slice($hariUrut, $i, 2);

            $outer = $section->addTable(['cellMargin' => 0]);
            $outer->addRow();
            foreach ($pasangan as $hari) {
                $cell = $outer->addCell(9500, ['valign' => 'top']);
                $this->tulisTabelHari($cell, $hari, $periods[$hari], $classes, $kodePerSel);
            }
            $section->addTextBreak(1);
        }

        $this->tulisTandaTangan($section, $request);

        $namaFile = 'Jadwal-Pelajaran-' . ($tahunAjaran?->nama ? str_replace('/', '-', $tahunAjaran->nama) : 'export') . '.docx';
        $tempPath = storage_path('app/temp-' . uniqid() . '.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    private function tulisTabelHari($cell, string $hari, $periodsHariIni, $classes, array $kodePerSel): void
    {
        $lebarWaktu = 900;
        $lebarJamKe = 500;
        $lebarKelas = max(400, (int) ((9500 - $lebarWaktu - $lebarJamKe) / max($classes->count(), 1)));

        $table = $cell->addTable(['borderSize' => 4, 'borderColor' => '444444', 'cellMargin' => 30]);

        $table->addRow();
        $table->addCell($lebarWaktu + $lebarJamKe + $lebarKelas * $classes->count(), ['gridSpan' => 2 + $classes->count(), 'bgColor' => '0B1B3A'])
            ->addText(self::HARI_LABEL[$hari] ?? strtoupper($hari), ['bold' => true, 'color' => 'FFFFFF', 'size' => 12], ['alignment' => Jc::CENTER]);

        $table->addRow();
        $headerStyle = ['bgColor' => 'DDE6F5', 'bold' => true];
        $table->addCell($lebarWaktu, $headerStyle)->addText('WAKTU', $headerStyle, ['alignment' => Jc::CENTER]);
        $table->addCell($lebarJamKe, $headerStyle)->addText('JAM KE-', $headerStyle, ['alignment' => Jc::CENTER]);
        foreach ($classes as $c) {
            $table->addCell($lebarKelas, $headerStyle)->addText($c->name, array_merge($headerStyle, ['size' => 8]), ['alignment' => Jc::CENTER]);
        }

        foreach ($periodsHariIni as $period) {
            $table->addRow();
            $waktu = substr($period->waktu_mulai, 0, 5) . '-' . substr($period->waktu_selesai, 0, 5);
            $table->addCell($lebarWaktu)->addText($waktu, ['size' => 7], ['alignment' => Jc::CENTER]);
            $table->addCell($lebarJamKe)->addText($period->jam_ke ?? '', [], ['alignment' => Jc::CENTER]);

            if ($period->tipe === 'khusus') {
                $cellStyle = $period->warna ? ['bgColor' => ltrim($period->warna, '#')] : [];
                $table->addCell($lebarKelas * $classes->count(), array_merge($cellStyle, ['gridSpan' => $classes->count()]))
                    ->addText($period->label_khusus, array_merge($cellStyle, ['bold' => true, 'size' => 8]), ['alignment' => Jc::CENTER]);
            } else {
                foreach ($classes as $c) {
                    $kode = $kodePerSel[$period->id . '-' . $c->id] ?? '';
                    $table->addCell($lebarKelas)->addText($kode, ['size' => 8], ['alignment' => Jc::CENTER]);
                }
            }
        }
    }

    private function tulisTandaTangan($section, Request $request): void
    {
        $kepsekNama = $request->input('kepsek_nama', '');
        $kepsekNip = $request->input('kepsek_nip', '');
        $wakaNama = $request->input('waka_nama', '');
        $wakaNbm = $request->input('waka_nbm', '');
        $tempat = $request->input('tempat', 'Sampit');
        $tanggal = $request->input('tanggal', now()->translatedFormat('d F Y'));

        $section->addTextBreak(1);
        $table = $section->addTable(['cellMargin' => 0]);
        $table->addRow();
        $kiri = $table->addCell(7250);
        $kiri->addText('Mengetahui,');
        $kiri->addText('Kepala Sekolah');
        $kiri->addTextBreak(3);
        $kiri->addText($kepsekNama ?: '.......................................', ['bold' => true, 'underline' => 'single']);
        $kiri->addText('NIP. ' . ($kepsekNip ?: '.......................................'));

        $kanan = $table->addCell(7250);
        $kanan->addText($tempat . ', ' . $tanggal, [], ['alignment' => Jc::END]);
        $kanan->addText('Wakil Kepala Sekolah Bidang Kurikulum', [], ['alignment' => Jc::END]);
        $kanan->addTextBreak(3);
        $kanan->addText($wakaNama ?: '.......................................', ['bold' => true, 'underline' => 'single'], ['alignment' => Jc::END]);
        $kanan->addText('NBM. ' . ($wakaNbm ?: '.......................................'), [], ['alignment' => Jc::END]);
    }
}
