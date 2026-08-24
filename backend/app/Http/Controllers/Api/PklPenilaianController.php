<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklPenilaian;
use App\Models\PklPlacement;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

class PklPenilaianController extends Controller
{
    private function bolehLihat(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'admin') return true;
        if ($user->role === 'guru') {
            $teacher = $user->teacher;
            return $teacher && $placement->guru_pembimbing_id === $teacher->id;
        }
        if ($user->role === 'instruktur') {
            $iduka = $user->iduka;
            return $iduka && $placement->iduka_id === $iduka->id;
        }
        if ($user->role === 'siswa') {
            $student = $user->student;
            return $student && $placement->student_id === $student->id;
        }
        return false;
    }

    public function show(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihat($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang melihat penilaian ini.'], 403);
        }

        $penilaian = $pklPlacement->penilaian()->with(['kompetensis', 'submittedBy.iduka'])->first();

        if (!$penilaian) {
            return response('null', 200)->header('Content-Type', 'application/json');
        }

        return response()->json($penilaian);
    }

    public function store(Request $request, PklPlacement $pklPlacement)
    {
        $user = $request->user();
        $iduka = $user->iduka;

        if (!$iduka || $pklPlacement->iduka_id !== $iduka->id) {
            return response()->json(['message' => 'Anda tidak berwenang menilai siswa ini.'], 403);
        }

        if ($pklPlacement->penilaian()->exists()) {
            return response()->json(['message' => 'Penilaian untuk siswa ini sudah pernah dikirim. Gunakan menu edit kalau ada yang perlu diperbaiki.'], 422);
        }

        $data = $request->validate([
            'skor_disiplin'              => 'required|integer|min:1|max:4',
            'skor_sikap'                 => 'required|integer|min:1|max:4',
            'skor_komunikasi'            => 'required|integer|min:1|max:4',
            'skor_inisiatif'             => 'required|integer|min:1|max:4',
            'skor_k3'                    => 'required|integer|min:1|max:4',
            'catatan'                    => 'nullable|string|max:1000',
            'kompetensi'                 => 'required|array|min:1',
            'kompetensi.*.nama_kompetensi' => 'required|string|max:150',
            'kompetensi.*.skor'          => 'required|integer|min:1|max:4',
        ]);

        $penilaian = DB::transaction(function () use ($data, $pklPlacement, $user) {
            $skorTetap = [
                $data['skor_disiplin'], $data['skor_sikap'], $data['skor_komunikasi'],
                $data['skor_inisiatif'], $data['skor_k3'],
            ];
            $jumlahSkor = array_sum($skorTetap) + array_sum(array_column($data['kompetensi'], 'skor'));
            $jumlahItem = count($skorTetap) + count($data['kompetensi']);
            $nilaiAkhir = round(($jumlahSkor / ($jumlahItem * 4)) * 100, 2);

            $penilaian = PklPenilaian::create([
                'pkl_placement_id' => $pklPlacement->id,
                'skor_disiplin'    => $data['skor_disiplin'],
                'skor_sikap'       => $data['skor_sikap'],
                'skor_komunikasi'  => $data['skor_komunikasi'],
                'skor_inisiatif'   => $data['skor_inisiatif'],
                'skor_k3'          => $data['skor_k3'],
                'catatan'          => $data['catatan'] ?? null,
                'nilai_akhir'      => $nilaiAkhir,
                'submitted_by'     => $user->id,
            ]);

            foreach ($data['kompetensi'] as $i => $k) {
                $penilaian->kompetensis()->create([
                    'nama_kompetensi' => $k['nama_kompetensi'],
                    'skor'            => $k['skor'],
                    'urutan'          => $i,
                ]);
            }

            $pklPlacement->update(['nilai_akhir' => $nilaiAkhir]);

            return $penilaian;
        });

        $pklPlacement->loadMissing(['student.user', 'student.parents']);
        $student = $pklPlacement->student;
        NotificationDispatcher::send($student->user, 'pkl', 'Nilai akhir PKL keluar', "Nilai akhir PKL kamu: {$pklPlacement->nilai_akhir}.", '/siswa');
        NotificationDispatcher::sendMany($student->parents, 'pkl', 'Nilai akhir PKL anak Anda', "Nilai akhir PKL {$student->user->name}: {$pklPlacement->nilai_akhir}.", '/wali');

        return response()->json([
            'message'   => 'Penilaian berhasil dikirim dan bersifat final.',
            'penilaian' => $penilaian->load('kompetensis'),
        ], 201);
    }

    /**
     * IDUKA mengedit penilaian yang sudah pernah dikirim (misal ada skor yang
     * salah input). Kompetensi teknis lama dihapus & diganti total dengan
     * yang baru, supaya konsisten dengan isian form (bisa tambah/kurang baris).
     */
    public function update(Request $request, PklPlacement $pklPlacement)
    {
        $user = $request->user();
        $iduka = $user->iduka;

        if (!$iduka || $pklPlacement->iduka_id !== $iduka->id) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah penilaian ini.'], 403);
        }

        $penilaian = $pklPlacement->penilaian;
        if (!$penilaian) {
            return response()->json(['message' => 'Belum ada penilaian untuk diedit.'], 404);
        }

        if ($pklPlacement->status === 'selesai') {
            return response()->json(['message' => 'Penilaian tidak bisa diubah karena PKL siswa ini sudah ditandai selesai.'], 422);
        }

        $data = $request->validate([
            'skor_disiplin'              => 'required|integer|min:1|max:4',
            'skor_sikap'                 => 'required|integer|min:1|max:4',
            'skor_komunikasi'            => 'required|integer|min:1|max:4',
            'skor_inisiatif'             => 'required|integer|min:1|max:4',
            'skor_k3'                    => 'required|integer|min:1|max:4',
            'catatan'                    => 'nullable|string|max:1000',
            'kompetensi'                 => 'required|array|min:1',
            'kompetensi.*.nama_kompetensi' => 'required|string|max:150',
            'kompetensi.*.skor'          => 'required|integer|min:1|max:4',
        ]);

        return DB::transaction(function () use ($data, $pklPlacement, $penilaian) {
            $skorTetap = [
                $data['skor_disiplin'], $data['skor_sikap'], $data['skor_komunikasi'],
                $data['skor_inisiatif'], $data['skor_k3'],
            ];
            $jumlahSkor = array_sum($skorTetap) + array_sum(array_column($data['kompetensi'], 'skor'));
            $jumlahItem = count($skorTetap) + count($data['kompetensi']);
            $nilaiAkhir = round(($jumlahSkor / ($jumlahItem * 4)) * 100, 2);

            $penilaian->update([
                'skor_disiplin'    => $data['skor_disiplin'],
                'skor_sikap'       => $data['skor_sikap'],
                'skor_komunikasi'  => $data['skor_komunikasi'],
                'skor_inisiatif'   => $data['skor_inisiatif'],
                'skor_k3'          => $data['skor_k3'],
                'catatan'          => $data['catatan'] ?? null,
                'nilai_akhir'      => $nilaiAkhir,
            ]);

            $penilaian->kompetensis()->delete();
            foreach ($data['kompetensi'] as $i => $k) {
                $penilaian->kompetensis()->create([
                    'nama_kompetensi' => $k['nama_kompetensi'],
                    'skor'            => $k['skor'],
                    'urutan'          => $i,
                ]);
            }

            $pklPlacement->update(['nilai_akhir' => $nilaiAkhir]);

            return response()->json([
                'message'   => 'Penilaian berhasil diperbarui.',
                'penilaian' => $penilaian->fresh('kompetensis'),
            ]);
        });
    }

    /**
     * IDUKA menghapus penilaian yang sudah pernah dikirim (misal salah total,
     * mau isi ulang dari awal). Menghapus baris ini otomatis ikut menghapus
     * kompetensi teknisnya (cascadeOnDelete), dan mengosongkan kembali
     * nilai_akhir di pkl_placements.
     */
    public function destroy(Request $request, PklPlacement $pklPlacement)
    {
        $user = $request->user();
        $iduka = $user->iduka;

        if (!$iduka || $pklPlacement->iduka_id !== $iduka->id) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus penilaian ini.'], 403);
        }

        $penilaian = $pklPlacement->penilaian;
        if (!$penilaian) {
            return response()->json(['message' => 'Belum ada penilaian untuk dihapus.'], 404);
        }

        if ($pklPlacement->status === 'selesai') {
            return response()->json(['message' => 'Penilaian tidak bisa dihapus karena PKL siswa ini sudah ditandai selesai.'], 422);
        }

        $penilaian->delete();
        $pklPlacement->update(['nilai_akhir' => null]);

        return response()->json(['message' => 'Penilaian berhasil dihapus.']);
    }

    /**
     * Export formulir penilaian ke file Word (.docx), meniru tata letak
     * formulir kertas aslinya. Bagian tanggal, tanda tangan, dan nama
     * instruktur SENGAJA dikosongkan (titik-titik) supaya diisi manual —
     * bukan otomatis dari data sistem.
     *
     * Catatan implementasi: sengaja pakai API PhpWord paling dasar/aman
     * (addText biasa, tanpa mode HTML atau pengaturan tema font) supaya
     * hasil .docx-nya konsisten valid dibuka Microsoft Word.
     */
    public function exportWord(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihat($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang mengakses penilaian ini.'], 403);
        }

        $penilaian = $pklPlacement->penilaian()->with('kompetensis')->first();
        if (!$penilaian) {
            return response()->json(['message' => 'Siswa ini belum punya penilaian PKL.'], 404);
        }

        $aspekTetap = [
            ['label' => 'Disiplin dan Kehadiran', 'indikator' => 'Hadir tepat waktu, mematuhi jam kerja, dan tertib dalam kehadiran', 'skor' => $penilaian->skor_disiplin],
            ['label' => 'Sikap dan Etika Kerja', 'indikator' => 'Sopan, jujur, amanah, bertanggung jawab, dan mematuhi aturan', 'skor' => $penilaian->skor_sikap],
            ['label' => 'Komunikasi dan Kerja Sama', 'indikator' => 'Berkomunikasi dengan baik dan mampu bekerja sama', 'skor' => $penilaian->skor_komunikasi],
            ['label' => 'Inisiatif dan Adaptasi', 'indikator' => 'Mau belajar, tanggap terhadap arahan, mampu menyesuaikan diri', 'skor' => $penilaian->skor_inisiatif],
            ['label' => 'K3 dan Kepatuhan SOP', 'indikator' => 'Mematuhi prosedur keselamatan dan SOP yang berlaku', 'skor' => $penilaian->skor_k3],
        ];
        foreach ($penilaian->kompetensis as $k) {
            $aspekTetap[] = ['label' => $k->nama_kompetensi, 'indikator' => '', 'skor' => $k->skor];
        }

        $jumlahSkor = array_sum(array_column($aspekTetap, 'skor'));
        $skorMaks = count($aspekTetap) * 4;
        $namaSiswa = $pklPlacement->student?->user?->name ?? '-';

        $phpWord = new PhpWord();
        $section = $phpWord->addSection([
            'marginTop' => 850, 'marginBottom' => 850, 'marginLeft' => 1400, 'marginRight' => 850,
        ]);

        $section->addText('FORM PENILAIAN PESERTA PRAKTIK KERJA LAPANGAN (PKL)', ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER]);
        $section->addText('OLEH INSTRUKTUR IDUKA', ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);

        $section->addText('Nama Peserta            : ' . $namaSiswa);
        $section->addText('Konsentrasi Keahlian    : ' . ($pklPlacement->student?->classRoom?->name ?? '-'));
        $section->addText('Tempat PKL              : ' . ($pklPlacement->iduka?->nama_perusahaan ?? '-'));
        $section->addText('Periode PKL             : ' . $pklPlacement->tanggal_mulai . ' s.d. ' . $pklPlacement->tanggal_selesai);
        $section->addTextBreak(1);

        $tableStyle = ['borderSize' => 6, 'borderColor' => '999999', 'cellMargin' => 80];
        $headerStyle = ['bgColor' => 'EAF2FC', 'bold' => true];
        $table = $section->addTable($tableStyle);

        $table->addRow();
        $table->addCell(500)->addText('No.', $headerStyle);
        $table->addCell(2600)->addText('Aspek Penilaian', $headerStyle);
        $table->addCell(4800)->addText('Indikator Penilaian', $headerStyle);
        $table->addCell(1100)->addText('Skor (1-4)', $headerStyle);

        foreach ($aspekTetap as $i => $r) {
            $table->addRow();
            $table->addCell(500)->addText((string) ($i + 1));
            $table->addCell(2600)->addText($r['label']);
            $table->addCell(4800)->addText($r['indikator']);
            $table->addCell(1100)->addText((string) $r['skor'], [], ['alignment' => Jc::CENTER]);
        }

        $table->addRow();
        $table->addCell(7900, ['gridSpan' => 3, 'bgColor' => 'EAF2FC'])->addText('NILAI PKL (IDUKA)', ['bold' => true]);
        $table->addCell(1100, ['bgColor' => 'EAF2FC'])->addText((string) $penilaian->nilai_akhir, ['bold' => true], ['alignment' => Jc::CENTER]);

        $section->addTextBreak(1);
        $section->addText('Keterangan Skor: 4 = Sangat Baik | 3 = Baik | 2 = Cukup | 1 = Perlu Bimbingan');
        $section->addText('Jumlah Skor      : ' . $jumlahSkor);
        $section->addText('Skor Maksimal    : ' . $skorMaks);
        $section->addText('Nilai IDUKA      = (Jumlah Skor : Skor maks) x 100 = ' . $penilaian->nilai_akhir);
        $section->addText('Catatan Instruktur:');
        $section->addText($penilaian->catatan ?: '.......................................................................................................................');
        $section->addText('.......................................................................................................................');
        $section->addTextBreak(2);

        $section->addText('Sampit, ................................. 2026', [], ['alignment' => Jc::END]);
        $section->addText('Instruktur IDUKA,', [], ['alignment' => Jc::END]);
        $section->addTextBreak(3);
        $section->addText('(.....................................)', [], ['alignment' => Jc::END]);

        $namaFile = 'Penilaian-PKL-' . preg_replace('/[^A-Za-z0-9\-]/', '-', $namaSiswa) . '.docx';

        $tempPath = storage_path('app/temp-' . uniqid() . '.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }
}
