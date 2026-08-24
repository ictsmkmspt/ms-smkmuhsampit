<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklJournal;
use App\Models\PklPlacement;
use App\Models\Setting;
use App\Models\TahunAjaran;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\ListItem as ListItemStyle;

class PklJournalController extends Controller
{
    /**
     * True kalau user yang login berwenang melihat jurnal kegiatan penempatan ini —
     * admin, guru pembimbingnya, atau IDUKA pemiliknya.
     */
    private function bolehLihat(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ($user->role === 'guru') {
            $teacher = $user->teacher;
            return $teacher && $placement->guru_pembimbing_id === $teacher->id;
        }
        if ($user->role === 'iduka') {
            $iduka = $user->iduka;
            return $iduka && $placement->iduka_id === $iduka->id;
        }
        return false;
    }

    /**
     * True kalau user yang login berwenang mengisi kolom "Catatan" — sesuai format
     * jurnal kertas, kolom ini cuma diisi Instruktur Dunia Kerja (IDUKA), atau admin.
     */
    private function bolehIsiCatatan(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ($user->role === 'iduka') {
            $iduka = $user->iduka;
            return $iduka && $placement->iduka_id === $iduka->id;
        }
        return false;
    }

    private function placementSiswa(Request $request): ?PklPlacement
    {
        $student = $request->user()->student;
        if (!$student) {
            return null;
        }
        return $student->pklPlacementAktif()->first();
    }

    /**
     * Ambil penempatan PKL "relevan sekarang" siswa yang login — aktif kalau
     * ada, atau yang paling baru kalau sudah "selesai". Dipakai buat
     * riwayatSaya() supaya jurnalnya tidak mendadak kosong begitu PKL-nya
     * berakhir.
     */
    private function placementSiswaTerkini(Request $request): ?PklPlacement
    {
        $student = $request->user()->student;
        if (!$student) {
            return null;
        }
        return $student->pklPlacementTerkini();
    }

    /**
     * Siswa menambah 1 catatan "Kegiatan" baru untuk 1 tanggal (default hari ini).
     * Boleh lebih dari 1 kegiatan dalam tanggal yang sama (misal beda jam/tugas).
     * Kolom "Catatan" tidak bisa diisi lewat sini — itu wewenang IDUKA.
     */
    public function simpanKegiatan(Request $request)
    {
        $data = $request->validate([
            'date'     => 'nullable|date',
            'kegiatan' => 'required|string|max:2000',
        ]);

        $placement = $this->placementSiswa($request);
        if (!$placement) {
            return response()->json(['message' => 'Anda tidak sedang dalam masa PKL.'], 422);
        }

        $jurnal = PklJournal::create([
            'pkl_placement_id' => $placement->id,
            'student_id'       => $placement->student_id,
            'date'             => $data['date'] ?? now()->format('Y-m-d'),
            'kegiatan'         => $data['kegiatan'],
        ]);

        return response()->json([
            'message' => 'Kegiatan berhasil ditambahkan.',
            'jurnal'  => $jurnal,
        ], 201);
    }

    private function bolehUbahKegiatan(PklJournal $jurnal, $user): bool
    {
        if ($user->role === 'siswa') {
            $student = $user->student;
            return $student && $jurnal->student_id === $student->id;
        }
        return $this->bolehLihat($jurnal->placement, $user);
    }

    public function updateKegiatan(Request $request, PklJournal $pklJournal)
    {
        if (!$this->bolehUbahKegiatan($pklJournal, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah kegiatan ini.'], 403);
        }

        if ($pklJournal->catatan) {
            return response()->json(['message' => 'Kegiatan ini sudah dikomentari IDUKA, tidak bisa diubah lagi.'], 422);
        }

        $data = $request->validate([
            'date'     => 'nullable|date',
            'kegiatan' => 'required|string|max:2000',
        ]);

        $pklJournal->update([
            'date'     => $data['date'] ?? $pklJournal->date,
            'kegiatan' => $data['kegiatan'],
        ]);

        return response()->json([
            'message' => 'Kegiatan berhasil diperbarui.',
            'jurnal'  => $pklJournal->fresh(),
        ]);
    }

    public function destroyKegiatan(Request $request, PklJournal $pklJournal)
    {
        if (!$this->bolehUbahKegiatan($pklJournal, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus kegiatan ini.'], 403);
        }

        if ($pklJournal->catatan) {
            return response()->json(['message' => 'Kegiatan ini sudah dikomentari IDUKA, tidak bisa dihapus lagi.'], 422);
        }

        $pklJournal->delete();

        return response()->json(['message' => 'Kegiatan berhasil dihapus.']);
    }

    /**
     * Riwayat jurnal kegiatan siswa yang sedang login.
     */
    public function riwayatSaya(Request $request)
    {
        $placement = $this->placementSiswaTerkini($request);
        if (!$placement) {
            return response()->json([]);
        }

        return PklJournal::where('pkl_placement_id', $placement->id)
            ->orderByDesc('date')->get();
    }

    /**
     * Riwayat jurnal kegiatan 1 penempatan tertentu — dipakai guru pembimbing,
     * IDUKA, atau admin untuk memantau/mengisi catatan.
     */
    public function riwayatPenempatan(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihat($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang melihat jurnal siswa ini.'], 403);
        }

        return PklJournal::with('catatanBy')
            ->where('pkl_placement_id', $pklPlacement->id)
            ->orderByDesc('date')->get();
    }

    /**
     * Sama seperti bolehLihat(), tapi siswa yang bersangkutan juga boleh
     * (dipakai khusus export-word — siswa bisa unduh jurnal kegiatan
     * PKL-nya sendiri, sama seperti mereka bisa melihatnya lewat halaman
     * cetak).
     */
    private function bolehLihatTermasukSiswa(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'siswa') {
            $student = $user->student;
            return $student && $placement->student_id === $student->id;
        }
        return $this->bolehLihat($placement, $user);
    }

    /**
     * Export "Jurnal Kegiatan PKL" 1 bulan ke .docx — persis data yang
     * ditampilkan PrintPklJurnalKegiatan.jsx, cuma dalam format Word.
     */
    public function exportWord(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihatTermasukSiswa($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang mengakses jurnal siswa ini.'], 403);
        }

        $request->validate(['bulan' => 'required|date_format:Y-m']);
        $bulanPilih = $request->query('bulan');
        [$tahun, $bulanNum] = array_map('intval', explode('-', $bulanPilih));

        $pklPlacement->load(['student.user', 'iduka', 'guruPembimbing.user']);
        $entries = PklJournal::where('pkl_placement_id', $pklPlacement->id)
            ->where('date', 'like', $bulanPilih . '%')
            ->orderBy('date')->get();

        $hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $namaSiswa = $pklPlacement->student?->user?->name ?? '-';
        $namaSekolah = Setting::get('nama_sekolah', '');

        $phpWord = new PhpWord();
        $section = $phpWord->addSection([
            'marginTop' => 850, 'marginBottom' => 850, 'marginLeft' => 1400, 'marginRight' => 850,
        ]);

        $section->addText(strtoupper($namaSekolah), ['bold' => true, 'size' => 11]);
        $section->addText('JURNAL PRAKTIK KERJA LAPANGAN ' . $tahun, ['bold' => true, 'size' => 9]);
        $section->addTextBreak(1);
        $section->addText('JURNAL KEGIATAN PKL', ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);

        $section->addText('Nama Peserta PKL          : ' . $namaSiswa);
        $section->addText('Nama Iduka Tempat PKL     : ' . ($pklPlacement->iduka?->nama_perusahaan ?? '-'));
        $section->addText('Nama Instruktur           : ' . ($pklPlacement->iduka?->penanggung_jawab ?? '-'));
        $section->addText('Nama Guru Pembimbing      : ' . ($pklPlacement->guruPembimbing?->user?->name ?? '-'));
        $section->addText('Bulan                     : ' . $bulanNama[$bulanNum - 1] . ' ' . $tahun);
        $section->addTextBreak(1);

        $tableStyle = ['borderSize' => 6, 'borderColor' => '999999', 'cellMargin' => 80];
        $headerStyle = ['bgColor' => 'EAF2FC', 'bold' => true];
        $table = $section->addTable($tableStyle);

        $table->addRow();
        $table->addCell(500)->addText('No', $headerStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1600)->addText('Hari, tanggal', $headerStyle);
        $table->addCell(4200)->addText('Kegiatan', $headerStyle);
        $table->addCell(2700)->addText('Catatan', $headerStyle);

        foreach ($entries as $i => $e) {
            $d = strtotime($e->date);
            $table->addRow();
            $table->addCell(500)->addText((string) ($i + 1), [], ['alignment' => Jc::CENTER]);
            $table->addCell(1600)->addText($hari[date('w', $d)] . ', ' . date('j', $d));
            $table->addCell(4200)->addText($e->kegiatan);
            $table->addCell(2700)->addText($e->catatan ?: '');
        }
        if ($entries->isEmpty()) {
            $table->addRow();
            $table->addCell(9000, ['gridSpan' => 4])->addText('Belum ada kegiatan yang diisi untuk bulan ini.', [], ['alignment' => Jc::CENTER]);
        }

        $section->addTextBreak(2);
        $footerTable = $section->addTable(['cellMargin' => 0]);
        $footerTable->addRow();
        $kiri = $footerTable->addCell(4500);
        $kiri->addText('Guru Pembimbing,');
        $kiri->addTextBreak(3);
        $kiri->addText('.....................................');
        $kanan = $footerTable->addCell(4500);
        $kanan->addText('Sampit, .................................', [], ['alignment' => Jc::END]);
        $kanan->addText('Instruktur Dunia Kerja,', [], ['alignment' => Jc::END]);
        $kanan->addTextBreak(2);
        $kanan->addText('.....................................', [], ['alignment' => Jc::END]);

        $section->addTextBreak(1);
        $section->addText('Format Jurnal Kegiatan PKL', ['bold' => true]);
        $section->addListItem('Kolom 1 diisi dengan nomor urut', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Kolom 2 diisi dengan Hari dan tanggal kegiatan.', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Kolom 3 diisi dengan jenis kegiatan/pekerjaan atau keterampilan yang dilakukan murid.', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Kolom 4 diisi oleh Instruktur Dunia Kerja pada setiap kegiatan atau waktu tertentu.', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Jurnal diisi setiap hari, setiap bulan jurnal ditandatangani Guru Pembimbing dan Instruktur Dunia Kerja', 0, null, ListItemStyle::TYPE_ALPHANUM);

        $namaFile = 'Jurnal-Kegiatan-PKL-' . preg_replace('/[^A-Za-z0-9\-]/', '-', $namaSiswa) . '-' . $bulanNama[$bulanNum - 1] . '-' . $tahun . '.docx';

        $tempPath = storage_path('app/temp-' . uniqid() . '.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Jurnal kegiatan LINTAS penempatan — dipakai Laporan PKL > Kegiatan
     * Siswa > Jurnal Kegiatan (admin/waka kurikulum). Bisa disaring per
     * IDUKA (iduka_id) & status penempatan, default cuma tahun ajaran aktif
     * seperti laporan PKL lainnya.
     */
    public function report(Request $request)
    {
        $data = $request->validate([
            'iduka_id' => 'nullable|exists:idukas,id',
            'status' => 'nullable|in:aktif,selesai',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajarans,id',
        ]);

        $tahunAjaranId = $data['tahun_ajaran_id'] ?? TahunAjaran::aktifId();

        $placementQuery = PklPlacement::where('tahun_ajaran_id', $tahunAjaranId);
        if (!empty($data['iduka_id'])) {
            $placementQuery->where('iduka_id', $data['iduka_id']);
        }
        if (!empty($data['status'])) {
            $placementQuery->where('status', $data['status']);
        }
        $placementIds = $placementQuery->pluck('id');

        return PklJournal::with(['student.user', 'student.classRoom', 'placement.iduka', 'placement.guruPembimbing.user', 'catatanBy'])
            ->whereIn('pkl_placement_id', $placementIds)
            ->orderByDesc('date')
            ->get();
    }

    /**
     * IDUKA (atau admin) mengisi kolom "Catatan" pada 1 baris jurnal kegiatan.
     */
    public function isiCatatan(Request $request, PklJournal $pklJournal)
    {
        $placement = $pklJournal->placement;
        if (!$this->bolehIsiCatatan($placement, $request->user())) {
            return response()->json(['message' => 'Hanya IDUKA atau admin yang bisa mengisi catatan.'], 403);
        }

        $data = $request->validate([
            'catatan' => 'required|string|max:2000',
        ]);

        $pklJournal->catatan    = $data['catatan'];
        $pklJournal->catatan_by = $request->user()->id;
        $pklJournal->catatan_at = now();
        $pklJournal->save();

        $pklJournal->loadMissing('student.user');
        if ($pklJournal->student?->user) {
            NotificationDispatcher::send($pklJournal->student->user, 'pkl', 'Jurnal PKL dikomentari', "Kegiatan \"{$pklJournal->kegiatan}\" ({$pklJournal->date}) dikomentari IDUKA.", '/siswa');
        }

        return response()->json([
            'message' => 'Catatan berhasil disimpan.',
            'jurnal'  => $pklJournal->fresh('catatanBy'),
        ]);
    }
}
