<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicScore;
use App\Models\ClassRoom;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Subject;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AcademicScoreController extends Controller
{
    /**
     * Pastikan guru yang login memang punya Tugas Mengajar untuk mapel+kelas
     * ini di tahun ajaran aktif — tanpa ini, guru bisa lihat/isi/ubah nilai
     * mapel/kelas siapa saja cuma dengan mengganti subject_id/class_room_id
     * di request (dropdown frontend cuma penyaring tampilan, bukan pengaman).
     */
    private function isOwnAssignment(Request $request, int $subjectId, int $classRoomId): bool
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return false;
        }

        return TeachingAssignment::where('teacher_id', $teacher->id)
            ->where('subject_id', $subjectId)
            ->where('class_room_id', $classRoomId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->exists();
    }

    /**
     * Riwayat nilai milik guru ini, tahun ajaran aktif — dipakai tab Nilai
     * di dashboard Guru. subject_id/class_room_id sengaja OPSIONAL: tanpa
     * itu, kembalikan semua nilai lintas mapel+kelas yang benar-benar
     * diampu guru ini (dari Tugas Mengajar), supaya tabel langsung tampil
     * begitu tab dibuka tanpa harus pilih mapel/kelas dulu. Kalau diisi,
     * tetap dicek harus kombinasi yang benar-benar diampu guru ini.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'nullable|exists:subjects,id',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        if (!empty($data['subject_id']) && !empty($data['class_room_id'])
            && !$this->isOwnAssignment($request, $data['subject_id'], $data['class_room_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & kelas ini.'], 403);
        }

        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return response()->json([]);
        }

        $assignments = TeachingAssignment::where('teacher_id', $teacher->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->get(['subject_id', 'class_room_id']);

        if ($assignments->isEmpty()) {
            return response()->json([]);
        }

        return AcademicScore::with('student.user', 'student.classRoom', 'subject', 'recordedBy')
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->when(!empty($data['subject_id']), fn ($q) => $q->where('subject_id', $data['subject_id']))
            ->when(!empty($data['class_room_id']), fn ($q) => $q->whereHas('student', fn ($q2) => $q2->where('class_room_id', $data['class_room_id'])))
            ->where(function ($q) use ($assignments) {
                foreach ($assignments as $a) {
                    $q->orWhere(function ($q2) use ($a) {
                        $q2->where('subject_id', $a->subject_id)
                            ->whereHas('student', fn ($q3) => $q3->where('class_room_id', $a->class_room_id));
                    });
                }
            })
            ->orderByDesc('tanggal')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Simpan nilai 1 kegiatan (mis. "PR Bab 3") untuk banyak siswa sekaligus
     * — dipakai form utama tab Nilai, supaya guru tidak perlu klik simpan
     * satu-satu per siswa. Semua siswa yang diisi wajib dari kelas yang
     * sama, dan kelas+mapel itu wajib benar Tugas Mengajar guru ini.
     */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'nama_kegiatan' => 'required|string|max:100',
            'tanggal' => 'required|date',
            'skor' => 'required|array|min:1',
            'skor.*.student_id' => 'required|exists:students,id',
            'skor.*.nilai' => 'required|integer|min:0|max:100',
        ]);

        $studentIds = collect($data['skor'])->pluck('student_id')->unique();
        $classRoomIds = Student::whereIn('id', $studentIds)->pluck('class_room_id')->unique();

        if ($classRoomIds->count() !== 1) {
            return response()->json(['message' => 'Semua siswa yang diisi nilainya harus dari kelas yang sama.'], 422);
        }

        if (!$this->isOwnAssignment($request, $data['subject_id'], $classRoomIds->first())) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & kelas ini.'], 403);
        }

        $jumlah = DB::transaction(function () use ($data, $request) {
            foreach ($data['skor'] as $item) {
                AcademicScore::create([
                    'student_id' => $item['student_id'],
                    'subject_id' => $data['subject_id'],
                    'nama_kegiatan' => $data['nama_kegiatan'],
                    'skor' => $item['nilai'],
                    'tanggal' => $data['tanggal'],
                    'recorded_by' => $request->user()->id,
                ]);
            }
            return count($data['skor']);
        });

        return response()->json(['message' => "$jumlah nilai berhasil disimpan."], 201);
    }

    /**
     * Koreksi 1 baris nilai yang salah input — dikunci ke tahun ajaran aktif
     * saja (sama seperti Tugas Mengajar/Jadwal), dan cuma guru yang memang
     * punya Tugas Mengajar untuk mapel+kelas nilai ini yang boleh mengubah.
     */
    public function update(Request $request, AcademicScore $academicScore)
    {
        if ($academicScore->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Nilai ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.'], 422);
        }

        $academicScore->loadMissing('student');
        if (!$this->isOwnAssignment($request, $academicScore->subject_id, $academicScore->student->class_room_id)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah nilai ini.'], 403);
        }

        $data = $request->validate([
            'nama_kegiatan' => 'required|string|max:100',
            'skor' => 'required|integer|min:0|max:100',
            'tanggal' => 'required|date',
        ]);

        $academicScore->update($data);

        return $academicScore->fresh('student.user');
    }

    public function destroy(Request $request, AcademicScore $academicScore)
    {
        if ($academicScore->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Nilai ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus.'], 422);
        }

        $academicScore->loadMissing('student');
        if (!$this->isOwnAssignment($request, $academicScore->subject_id, $academicScore->student->class_room_id)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus nilai ini.'], 403);
        }

        $academicScore->delete();

        return response()->json(['message' => 'Nilai dihapus.']);
    }

    /**
     * Cek kepemilikan sekumpulan baris AcademicScore sekaligus (dipakai
     * edit/hapus kegiatan) tanpa query per-baris — ambil semua Tugas
     * Mengajar guru ini SEKALI, lalu cocokkan tiap baris di memori.
     * Return null kalau semua baris aman, atau pesan error kalau ada yang
     * bukan tahun ajaran aktif / bukan milik guru ini.
     */
    private function cekKepemilikanKegiatan(Request $request, $rows): ?string
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return 'Anda tidak berwenang mengubah kegiatan ini.';
        }

        $pasangan = TeachingAssignment::where('teacher_id', $teacher->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->get(['subject_id', 'class_room_id'])
            ->map(fn ($a) => "{$a->subject_id}-{$a->class_room_id}")
            ->flip();

        $tahunAktif = TahunAjaran::aktifId();
        foreach ($rows as $row) {
            if ($row->tahun_ajaran_id !== $tahunAktif) {
                return 'Kegiatan ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah.';
            }
            if (!$pasangan->has("{$row->subject_id}-{$row->student->class_room_id}")) {
                return 'Anda tidak berwenang mengubah kegiatan ini.';
            }
        }

        return null;
    }

    /**
     * Ubah nama kegiatan/tanggal untuk SEMUA nilai dalam 1 kegiatan
     * sekaligus (bukan satu-satu per siswa) — dipakai tombol "Edit
     * Kegiatan". Frontend mengirim id semua baris kegiatan itu (sudah
     * dikelompokkan di sisi tampilan), server tetap verifikasi
     * kepemilikan tiap barisnya sebelum mengubah.
     */
    public function updateKegiatan(Request $request)
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|integer|exists:academic_scores,id',
            'nama_kegiatan' => 'required|string|max:100',
            'tanggal' => 'required|date',
        ]);

        $rows = AcademicScore::with('student')->whereIn('id', $data['ids'])->get();

        if ($pesan = $this->cekKepemilikanKegiatan($request, $rows)) {
            return response()->json(['message' => $pesan], 403);
        }

        AcademicScore::whereIn('id', $data['ids'])->update([
            'nama_kegiatan' => $data['nama_kegiatan'],
            'tanggal' => $data['tanggal'],
        ]);

        return response()->json(['message' => 'Kegiatan berhasil diubah.']);
    }

    /**
     * Hapus SEMUA nilai dalam 1 kegiatan sekaligus — dipakai tombol
     * "Hapus Kegiatan" (beda dari hapus 1 baris nilai siswa tertentu).
     */
    public function destroyKegiatan(Request $request)
    {
        $data = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'required|integer|exists:academic_scores,id',
        ]);

        $rows = AcademicScore::with('student')->whereIn('id', $data['ids'])->get();

        if ($pesan = $this->cekKepemilikanKegiatan($request, $rows)) {
            return response()->json(['message' => $pesan], 403);
        }

        AcademicScore::whereIn('id', $data['ids'])->delete();

        return response()->json(['message' => 'Kegiatan dihapus.']);
    }

    /**
     * Ekspor "Daftar Nilai Murid" 1 mapel + 1 kelas ke Excel — mengikuti
     * format dokumen kurikulum sekolah (kop, kolom NILAI ASESMEN per
     * kegiatan, baris NILAI RERATA KELAS, blok tanda tangan Kepala
     * Sekolah/Waka Kurikulum/Guru Mapel). Guru mengisi/mencetak lalu minta
     * tanda tangan fisik ke Kepsek & Waka Kurikulum — dokumen ini sengaja
     * TIDAK punya menu tersendiri di sisi Admin.
     */
    public function exportExcel(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'class_room_id' => 'required|exists:class_rooms,id',
            'semester' => 'nullable|in:ganjil,genap',
            'kepsek_nama' => 'nullable|string|max:100',
            'kepsek_nip' => 'nullable|string|max:50',
            'waka_nama' => 'nullable|string|max:100',
            'waka_nbm' => 'nullable|string|max:50',
            'guru_nbm' => 'nullable|string|max:50',
            'tempat' => 'nullable|string|max:50',
            'tanggal' => 'nullable|string|max:30',
        ]);

        if (!$this->isOwnAssignment($request, $data['subject_id'], $data['class_room_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran & kelas ini.'], 403);
        }

        $subject = Subject::findOrFail($data['subject_id']);
        $classRoom = ClassRoom::findOrFail($data['class_room_id']);
        $tahunAjaran = TahunAjaran::find(TahunAjaran::aktifId());
        $students = Student::with('user')->where('class_room_id', $classRoom->id)->where('status', 'aktif')
            ->get()->sortBy(fn ($s) => $s->user->name)->values();

        $scores = AcademicScore::where('subject_id', $subject->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->whereIn('student_id', $students->pluck('id'))
            ->get();

        // Kolom kegiatan diambil dari kombinasi (nama_kegiatan, tanggal)
        // yang benar-benar pernah dicatat, diurutkan tanggal — jumlah &
        // isinya otomatis mengikuti apa yang sudah diisi guru, tidak perlu
        // diatur manual.
        $kegiatanList = $scores->groupBy(fn ($s) => "{$s->tanggal}||{$s->nama_kegiatan}")
            ->map(fn ($group) => ['tanggal' => $group->first()->tanggal, 'nama' => $group->first()->nama_kegiatan])
            ->sortBy('tanggal')->values();

        // skorPerSiswa[student_id][tanggal||nama] = skor
        $skorPerSiswa = [];
        foreach ($scores as $s) {
            $skorPerSiswa[$s->student_id]["{$s->tanggal}||{$s->nama_kegiatan}"] = $s->skor;
        }

        $namaSekolah = Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit');
        $logo = Setting::get('logo_sekolah', '');
        $logoPath = $logo && Storage::disk('public')->exists($logo) ? Storage::disk('public')->path($logo) : null;

        $kolTetap = 4; // NO, NIS, NAMA SISWA, L/P
        $jumlahKegiatan = max(1, $kegiatanList->count());
        $totalKolom = $kolTetap + $jumlahKegiatan + 1; // + NILAI AKHIR
        $kolomTerakhir = Coordinate::stringFromColumnIndex($totalKolom);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Daftar Nilai');

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

        $sheet->setCellValue("A{$baris}", 'DAFTAR NILAI MURID');
        $sheet->mergeCells("A{$baris}:{$kolomTerakhir}{$baris}");
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getRowDimension($baris)->setRowHeight(22);
        $baris++;

        $sheet->setCellValue("A{$baris}", strtoupper($namaSekolah));
        $sheet->mergeCells("A{$baris}:{$kolomTerakhir}{$baris}");
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true);
        $sheet->getStyle("A{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $baris += 2;

        $identitas = [
            'MATA PELAJARAN' => $subject->nama,
            'KELAS' => $classRoom->name,
            'SEMESTER' => strtoupper($data['semester'] ?? '-'),
            'TAHUN AJARAN' => $tahunAjaran?->nama ?? '-',
        ];
        foreach ($identitas as $label => $nilai) {
            $sheet->setCellValue("A{$baris}", $label);
            $sheet->setCellValue("C{$baris}", ': ' . $nilai);
            $sheet->getStyle("A{$baris}")->getFont()->setBold(true);
            $baris++;
        }
        $baris++;

        // Header tabel: baris 1 = judul kolom tetap + "NILAI ASESMEN" (merge
        // di atas seluruh kolom kegiatan), baris 2 = tanggal tiap kegiatan,
        // baris 3 = nama kegiatan tiap kegiatan.
        $barisHeaderAwal = $baris;
        $sheet->setCellValue("A{$baris}", 'NO');
        $sheet->setCellValue("B{$baris}", 'NIS');
        $sheet->setCellValue("C{$baris}", 'NAMA SISWA');
        $sheet->setCellValue("D{$baris}", 'L/P');
        $sheet->mergeCells("A{$baris}:A" . ($baris + 2));
        $sheet->mergeCells("B{$baris}:B" . ($baris + 2));
        $sheet->mergeCells("C{$baris}:C" . ($baris + 2));
        $sheet->mergeCells("D{$baris}:D" . ($baris + 2));

        $kolKegiatanMulai = $kolTetap + 1;
        $kolKegiatanAkhirHuruf = Coordinate::stringFromColumnIndex($kolTetap + $jumlahKegiatan);
        $sheet->setCellValue(Coordinate::stringFromColumnIndex($kolKegiatanMulai) . $baris, 'NILAI ASESMEN');
        if ($jumlahKegiatan > 1) {
            $sheet->mergeCells(Coordinate::stringFromColumnIndex($kolKegiatanMulai) . "{$baris}:{$kolKegiatanAkhirHuruf}{$baris}");
        }

        $kolAkhirHuruf = Coordinate::stringFromColumnIndex($totalKolom);
        $sheet->setCellValue("{$kolAkhirHuruf}{$baris}", 'NILAI AKHIR');
        $sheet->mergeCells("{$kolAkhirHuruf}{$baris}:{$kolAkhirHuruf}" . ($baris + 2));

        $baris++;
        $kol = $kolKegiatanMulai;
        foreach ($kegiatanList as $k) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . $baris, $k['tanggal']);
            $kol++;
        }
        $baris++;
        $kol = $kolKegiatanMulai;
        foreach ($kegiatanList as $k) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . $baris, $k['nama']);
            $kol++;
        }
        $baris++;

        $headerRange = "A{$barisHeaderAwal}:{$kolomTerakhir}" . ($baris - 1);
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFDDE6F5');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER)->setWrapText(true);
        $sheet->getStyle($headerRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // Baris tiap siswa — kolom kegiatan yang siswa itu tidak punya
        // skornya (mis. baru masuk kelas belakangan) sengaja dikosongkan,
        // bukan dianggap 0, supaya rata-ratanya tidak diturunkan secara
        // tidak adil oleh kegiatan yang memang belum berlaku untuknya.
        $totalPerKegiatan = array_fill(0, $jumlahKegiatan, ['jumlah' => 0, 'n' => 0]);
        $totalNilaiAkhir = 0;
        $nSiswaDenganNilai = 0;

        foreach ($students as $i => $s) {
            $sheet->setCellValue("A{$baris}", $i + 1);
            $sheet->setCellValue("B{$baris}", $s->nis);
            $sheet->setCellValue("C{$baris}", $s->user->name);
            $sheet->setCellValue("D{$baris}", strtoupper($s->jenis_kelamin ?? ''));

            $kol = $kolKegiatanMulai;
            $skorSiswa = [];
            foreach ($kegiatanList as $idx => $k) {
                $skor = $skorPerSiswa[$s->id]["{$k['tanggal']}||{$k['nama']}"] ?? null;
                if ($skor !== null) {
                    $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . $baris, $skor);
                    $skorSiswa[] = $skor;
                    $totalPerKegiatan[$idx]['jumlah'] += $skor;
                    $totalPerKegiatan[$idx]['n']++;
                }
                $kol++;
            }

            if (count($skorSiswa) > 0) {
                $nilaiAkhir = round(array_sum($skorSiswa) / count($skorSiswa), 1);
                $sheet->setCellValue("{$kolAkhirHuruf}{$baris}", $nilaiAkhir);
                $totalNilaiAkhir += $nilaiAkhir;
                $nSiswaDenganNilai++;
            }

            $rowRange = "A{$baris}:{$kolomTerakhir}{$baris}";
            $sheet->getStyle($rowRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
            $sheet->getStyle("A{$baris}:D{$baris}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $sheet->getStyle("D{$baris}:{$kolomTerakhir}{$baris}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $baris++;
        }

        // Baris NILAI RERATA KELAS
        $sheet->setCellValue("A{$baris}", 'NILAI RERATA KELAS');
        $sheet->mergeCells("A{$baris}:D{$baris}");
        $kol = $kolKegiatanMulai;
        foreach ($totalPerKegiatan as $t) {
            if ($t['n'] > 0) {
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($kol) . $baris, round($t['jumlah'] / $t['n'], 1));
            }
            $kol++;
        }
        if ($nSiswaDenganNilai > 0) {
            $sheet->setCellValue("{$kolAkhirHuruf}{$baris}", round($totalNilaiAkhir / $nSiswaDenganNilai, 1));
        }
        $rerataRange = "A{$baris}:{$kolomTerakhir}{$baris}";
        $sheet->getStyle($rerataRange)->getFont()->setBold(true);
        $sheet->getStyle($rerataRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFDDE6F5');
        $sheet->getStyle($rerataRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle($rerataRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $baris += 2;

        $sheet->setCellValue("A{$baris}", 'KETERANGAN :');
        $sheet->getStyle("A{$baris}")->getFont()->setBold(true);
        $baris++;
        foreach ([
            'Teknik asesmen disesuaikan mapel masing-masing.',
            'NILAI AKHIR = rata-rata seluruh nilai asesmen yang tercatat.',
        ] as $ket) {
            $sheet->setCellValue("A{$baris}", $ket);
            $baris++;
        }

        $this->tulisTandaTanganNilaiExcel($sheet, $baris, $totalKolom, $request);

        $sheet->getColumnDimension('A')->setWidth(5);
        $sheet->getColumnDimension('B')->setWidth(12);
        $sheet->getColumnDimension('C')->setWidth(26);
        $sheet->getColumnDimension('D')->setWidth(6);
        for ($k = $kolKegiatanMulai; $k <= $kolTetap + $jumlahKegiatan; $k++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($k))->setWidth(13);
        }
        $sheet->getColumnDimension($kolAkhirHuruf)->setWidth(12);

        $sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $sheet->getPageSetup()->setFitToWidth(1);
        $sheet->getPageSetup()->setFitToHeight(0);

        $namaFile = 'Daftar-Nilai-' . str_replace(' ', '-', $subject->nama) . '-' . str_replace(' ', '-', $classRoom->name) . '.xlsx';
        $tempPath = storage_path('app/temp-' . uniqid() . '.xlsx');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Blok tanda tangan 3 kolom (Kepala Sekolah / Waka Kurikulum / Guru
     * Mapel) — sama seperti dokumen kurikulum lain di sekolah ini, guru
     * mengisi nama-nama ini sekali lalu tersimpan di perangkatnya (lihat
     * exportForm + localStorage di sisi frontend), tidak perlu diisi ulang
     * tiap ekspor.
     */
    private function tulisTandaTanganNilaiExcel($sheet, int $baris, int $totalKolom, Request $request): void
    {
        $kepsekNama = $request->input('kepsek_nama', '');
        $kepsekNip = $request->input('kepsek_nip', '');
        $wakaNama = $request->input('waka_nama', '');
        $wakaNbm = $request->input('waka_nbm', '');
        $guruNama = $request->user()->name;
        $guruNbm = $request->input('guru_nbm', '');
        $tempat = $request->input('tempat', 'Sampit');
        $tanggal = $request->input('tanggal', now()->translatedFormat('d F Y'));

        $lebarKolom = max(1, intdiv($totalKolom, 3));
        $kol1 = 'A';
        $kol2 = Coordinate::stringFromColumnIndex($lebarKolom + 1);
        $kol3 = Coordinate::stringFromColumnIndex(2 * $lebarKolom + 1);

        $sheet->setCellValue("{$kol1}{$baris}", 'Mengetahui :');
        $sheet->setCellValue("{$kol1}" . ($baris + 1), 'Kepala SMK Muhammadiyah Sampit');
        $sheet->setCellValue("{$kol1}" . ($baris + 5), $kepsekNama ?: '.......................................');
        $sheet->getStyle("{$kol1}" . ($baris + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->setCellValue("{$kol1}" . ($baris + 6), 'NIP. ' . ($kepsekNip ?: '.......................................'));

        $sheet->setCellValue("{$kol2}{$baris}", 'Disupervisi oleh :');
        $sheet->setCellValue("{$kol2}" . ($baris + 1), 'Waka Kurikulum');
        $sheet->setCellValue("{$kol2}" . ($baris + 5), $wakaNama ?: '.......................................');
        $sheet->getStyle("{$kol2}" . ($baris + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->setCellValue("{$kol2}" . ($baris + 6), 'NBM. ' . ($wakaNbm ?: '.......................................'));

        $sheet->setCellValue("{$kol3}{$baris}", $tempat . ', ' . $tanggal);
        $sheet->setCellValue("{$kol3}" . ($baris + 1), 'Guru Mapel');
        $sheet->setCellValue("{$kol3}" . ($baris + 5), $guruNama);
        $sheet->getStyle("{$kol3}" . ($baris + 5))->getFont()->setBold(true)->setUnderline(true);
        $sheet->setCellValue("{$kol3}" . ($baris + 6), 'NBM. ' . ($guruNbm ?: '.......................................'));
    }

    /**
     * Riwayat nilai siswa yang sedang login sendiri — dibatasi tahun ajaran
     * aktif, supaya nama kegiatan yang sama (mis. "PR Bab 3") dari tahun
     * ajaran berbeda tidak tercampur jadi 1 daftar tanpa keterangan tahun.
     */
    public function myScores(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json([]);
        }

        return AcademicScore::with('subject', 'recordedBy')
            ->where('student_id', $student->id)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->orderByDesc('tanggal')
            ->get();
    }
}
