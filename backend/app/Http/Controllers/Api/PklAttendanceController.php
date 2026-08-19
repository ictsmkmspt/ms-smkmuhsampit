<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklAttendance;
use App\Models\PklPlacement;
use App\Models\Setting;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\ListItem as ListItemStyle;

class PklAttendanceController extends Controller
{
    /**
     * True kalau user yang login berwenang MELIHAT absensi penempatan ini —
     * yaitu admin, guru pembimbingnya, atau DUDI pemiliknya.
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
        if ($user->role === 'dudi') {
            $dudi = $user->dudi;
            return $dudi && $placement->dudi_id === $dudi->id;
        }
        return false;
    }

    /**
     * True kalau user yang login berwenang MEMVERIFIKASI (paraf) absensi penempatan
     * ini — cuma DUDI pemiliknya atau admin. Guru pembimbing bisa lihat & koreksi,
     * tapi verifikasi/paraf resmi tetap tanggung jawab DUDI (instruktur lapangan).
     */
    private function bolehVerifikasi(PklPlacement $placement, $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ($user->role === 'dudi') {
            $dudi = $user->dudi;
            return $dudi && $placement->dudi_id === $dudi->id;
        }
        return false;
    }

    /**
     * Ambil penempatan AKTIF siswa yang login, atau null kalau tidak sedang
     * PKL — dipakai aksi yang memang cuma boleh selama PKL masih berjalan
     * (absen masuk/pulang, ajukan izin/sakit baru).
     */
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
     * riwayatSaya() supaya riwayat absensinya tidak mendadak kosong begitu
     * PKL-nya berakhir.
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
     * Absen masuk — WAJIB lokasi GPS, harus berada dalam radius yang diatur
     * admin untuk DUDI itu. Absensi yang tercatat berstatus "hadir" tapi baru
     * sah kalau sudah diverifikasi (di-paraf) oleh DUDI lewat endpoint verifikasi().
     */
    public function absenMasuk(Request $request)
    {
        $data = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $placement = $this->placementSiswa($request);
        if (!$placement) {
            return response()->json(['message' => 'Anda tidak sedang dalam masa PKL.'], 422);
        }

        $dudi = $placement->dudi;
        if (!$dudi || !$dudi->latitude || !$dudi->longitude) {
            return response()->json(['message' => 'Lokasi DUDI belum diatur oleh admin. Hubungi admin sekolah.'], 422);
        }

        $jarak = $dudi->jarakKe($data['latitude'], $data['longitude']);
        if (!$dudi->dalamRadius($data['latitude'], $data['longitude'])) {
            return response()->json([
                'message' => "Anda berada di luar radius lokasi DUDI ({$jarak}m dari lokasi, radius diizinkan {$dudi->radius_meter}m).",
            ], 422);
        }

        $tanggal = now()->format('Y-m-d');
        $absensi = PklAttendance::firstOrNew([
            'pkl_placement_id' => $placement->id,
            'date'             => $tanggal,
        ]);

        if ($absensi->exists && $absensi->time_in) {
            return response()->json(['message' => 'Anda sudah absen masuk hari ini pukul ' . $absensi->time_in . '.'], 422);
        }

        $absensi->student_id         = $placement->student_id;
        $absensi->time_in            = now()->format('H:i:s');
        $absensi->latitude_in        = $data['latitude'];
        $absensi->longitude_in       = $data['longitude'];
        $absensi->distance_in_meter  = $jarak;
        $absensi->status             = 'hadir';
        $absensi->save();

        return response()->json(['message' => 'Absen masuk berhasil.', 'absensi' => $absensi]);
    }

    /**
     * Absen pulang — mewajibkan sudah absen masuk dulu di tanggal yang sama,
     * WAJIB lokasi GPS juga.
     */
    public function absenPulang(Request $request)
    {
        $data = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $placement = $this->placementSiswa($request);
        if (!$placement) {
            return response()->json(['message' => 'Anda tidak sedang dalam masa PKL.'], 422);
        }

        $dudi = $placement->dudi;
        if (!$dudi || !$dudi->latitude || !$dudi->longitude) {
            return response()->json(['message' => 'Lokasi DUDI belum diatur oleh admin. Hubungi admin sekolah.'], 422);
        }

        $jarak = $dudi->jarakKe($data['latitude'], $data['longitude']);
        if (!$dudi->dalamRadius($data['latitude'], $data['longitude'])) {
            return response()->json([
                'message' => "Anda berada di luar radius lokasi DUDI ({$jarak}m dari lokasi, radius diizinkan {$dudi->radius_meter}m).",
            ], 422);
        }

        $tanggal = now()->format('Y-m-d');
        $absensi = PklAttendance::where('pkl_placement_id', $placement->id)
            ->where('date', $tanggal)->first();

        if (!$absensi || !$absensi->time_in) {
            return response()->json(['message' => 'Anda belum absen masuk hari ini.'], 422);
        }
        if ($absensi->time_out) {
            return response()->json(['message' => 'Anda sudah absen pulang hari ini pukul ' . $absensi->time_out . '.'], 422);
        }

        $absensi->time_out           = now()->format('H:i:s');
        $absensi->latitude_out       = $data['latitude'];
        $absensi->longitude_out      = $data['longitude'];
        $absensi->distance_out_meter = $jarak;
        $absensi->save();

        return response()->json(['message' => 'Absen pulang berhasil.', 'absensi' => $absensi]);
    }

    /**
     * Siswa mengajukan izin/sakit untuk 1 tanggal, lengkap dengan alasan. Ditolak
     * kalau tanggal itu sudah terlanjur ada absen masuk (berarti fisiknya hadir,
     * jadi tidak masuk akal mengajukan izin/sakit untuk hari yang sama).
     */
    public function ajukanIzinSakit(Request $request)
    {
        $data = $request->validate([
            'date'   => 'required|date|before_or_equal:' . now()->addDays(7)->format('Y-m-d'),
            'status' => 'required|in:izin,sakit',
            'alasan' => 'required|string|max:500',
        ], [
            'date.before_or_equal' => 'Tanggal izin/sakit maksimal 7 hari ke depan.',
        ]);

        $placement = $this->placementSiswa($request);
        if (!$placement) {
            return response()->json(['message' => 'Anda tidak sedang dalam masa PKL.'], 422);
        }

        $absensi = PklAttendance::firstOrNew([
            'pkl_placement_id' => $placement->id,
            'date'             => $data['date'],
        ]);

        if ($absensi->exists && $absensi->time_in) {
            return response()->json(['message' => 'Anda sudah tercatat absen masuk pada tanggal ini, tidak bisa mengajukan izin/sakit.'], 422);
        }

        $absensi->student_id      = $placement->student_id;
        $absensi->status          = $data['status'];
        $absensi->catatan_koreksi = $data['alasan'];
        $absensi->save();

        $label = $data['status'] === 'izin' ? 'Izin' : 'Sakit';
        return response()->json(['message' => "Pengajuan {$label} berhasil dikirim.", 'absensi' => $absensi]);
    }

    /**
     * Siswa mengubah pengajuan izin/sakit miliknya sendiri (salah tanggal/status/
     * alasan) — cuma boleh selama belum diverifikasi IDUKA dan belum ada absen
     * masuk beneran di baris itu (kalau sudah, itu bukan izin/sakit lagi).
     */
    public function updateIzinSakit(Request $request, PklAttendance $pklAttendance)
    {
        $data = $request->validate([
            'date'   => 'required|date|before_or_equal:' . now()->addDays(7)->format('Y-m-d'),
            'status' => 'required|in:izin,sakit',
            'alasan' => 'required|string|max:500',
        ], [
            'date.before_or_equal' => 'Tanggal izin/sakit maksimal 7 hari ke depan.',
        ]);

        $placement = $this->placementSiswa($request);
        if (!$placement || $pklAttendance->pkl_placement_id !== $placement->id) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah pengajuan ini.'], 403);
        }
        if ($pklAttendance->verified_at) {
            return response()->json(['message' => 'Pengajuan ini sudah diverifikasi IDUKA, tidak bisa diubah lagi.'], 422);
        }
        if ($pklAttendance->time_in) {
            return response()->json(['message' => 'Baris ini sudah tercatat absen masuk, bukan izin/sakit.'], 422);
        }

        $pklAttendance->date             = $data['date'];
        $pklAttendance->status           = $data['status'];
        $pklAttendance->catatan_koreksi  = $data['alasan'];
        $pklAttendance->save();

        return response()->json(['message' => 'Pengajuan berhasil diubah.', 'absensi' => $pklAttendance->fresh()]);
    }

    /**
     * Siswa membatalkan (hapus) pengajuan izin/sakit miliknya sendiri — sama
     * batasannya seperti updateIzinSakit(): belum diverifikasi & bukan absen
     * masuk beneran.
     */
    public function hapusIzinSakit(Request $request, PklAttendance $pklAttendance)
    {
        $placement = $this->placementSiswa($request);
        if (!$placement || $pklAttendance->pkl_placement_id !== $placement->id) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus pengajuan ini.'], 403);
        }
        if ($pklAttendance->verified_at) {
            return response()->json(['message' => 'Pengajuan ini sudah diverifikasi IDUKA, tidak bisa dihapus lagi.'], 422);
        }
        if ($pklAttendance->time_in) {
            return response()->json(['message' => 'Baris ini sudah tercatat absen masuk, bukan izin/sakit.'], 422);
        }

        $pklAttendance->delete();

        return response()->json(['message' => 'Pengajuan izin/sakit berhasil dibatalkan.']);
    }

    /**
     * Rekap jumlah hadir/izin/sakit/alpa per penempatan PKL — dipakai
     * Laporan PKL > Kegiatan Siswa > Absensi Kegiatan (admin/waka
     * kurikulum). Bisa disaring per IDUKA (dudi_id) & status penempatan,
     * default cuma tahun ajaran aktif seperti PklPlacementController::index().
     */
    public function report(Request $request)
    {
        $data = $request->validate([
            'dudi_id' => 'nullable|exists:dudis,id',
            'status' => 'nullable|in:aktif,selesai',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajarans,id',
        ]);

        $tahunAjaranId = $data['tahun_ajaran_id'] ?? TahunAjaran::aktifId();

        $query = PklPlacement::with(['student.user', 'student.classRoom', 'dudi', 'guruPembimbing.user'])
            ->where('tahun_ajaran_id', $tahunAjaranId);

        if (!empty($data['dudi_id'])) {
            $query->where('dudi_id', $data['dudi_id']);
        }
        if (!empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        $placements = $query->orderBy('tanggal_mulai')->get();

        $rekapPerPenempatan = PklAttendance::whereIn('pkl_placement_id', $placements->pluck('id'))
            ->selectRaw('pkl_placement_id, status, COUNT(*) as jumlah')
            ->groupBy('pkl_placement_id', 'status')
            ->get()
            ->groupBy('pkl_placement_id');

        $hasil = $placements->map(function ($p) use ($rekapPerPenempatan) {
            $rekap = ['hadir' => 0, 'izin' => 0, 'sakit' => 0, 'alpa' => 0];
            foreach ($rekapPerPenempatan->get($p->id, collect()) as $row) {
                $rekap[$row->status] = $row->jumlah;
            }
            $p->setAttribute('rekap_absensi', $rekap);
            return $p;
        });

        return response()->json($hasil);
    }

    /**
     * Riwayat absensi PKL siswa yang sedang login.
     */
    public function riwayatSaya(Request $request)
    {
        $placement = $this->placementSiswaTerkini($request);
        if (!$placement) {
            return response()->json([]);
        }

        return PklAttendance::with('verifiedBy.dudi')
            ->where('pkl_placement_id', $placement->id)
            ->orderByDesc('date')->get();
    }

    /**
     * Riwayat absensi 1 penempatan PKL tertentu — dipakai guru pembimbing, DUDI,
     * atau admin untuk memantau/mengoreksi/memverifikasi.
     */
    public function riwayatPenempatan(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihat($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang melihat absensi siswa ini.'], 403);
        }

        return PklAttendance::with('verifiedBy.dudi')
            ->where('pkl_placement_id', $pklPlacement->id)
            ->orderByDesc('date')->get();
    }

    /**
     * Sama seperti bolehLihat(), tapi siswa yang bersangkutan juga boleh
     * (dipakai khusus export-word — siswa bisa unduh daftar hadir PKL-nya
     * sendiri, sama seperti mereka bisa melihatnya lewat halaman cetak).
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
     * Export "Daftar Hadir Peserta PKL" 1 bulan ke .docx — persis data yang
     * ditampilkan PrintPklJurnal.jsx, cuma dalam format Word supaya bisa
     * diedit/dilampirkan. Tanda tangan Instruktur/verifikasi ditandai "✓"
     * saja (bukan gambar tanda tangan), sama seperti pola export nilai PKL
     * yang juga menyisakan baris kosong untuk tanda tangan basah.
     */
    public function exportWord(Request $request, PklPlacement $pklPlacement)
    {
        if (!$this->bolehLihatTermasukSiswa($pklPlacement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang mengakses absensi siswa ini.'], 403);
        }

        $request->validate(['bulan' => 'required|date_format:Y-m']);
        [$tahun, $bulanNum] = array_map('intval', explode('-', $request->query('bulan')));

        $pklPlacement->load(['student.user', 'student.classRoom', 'dudi']);
        $attendances = PklAttendance::where('pkl_placement_id', $pklPlacement->id)
            ->whereYear('date', $tahun)->whereMonth('date', $bulanNum)
            ->get()->keyBy(fn ($a) => $a->date->format('Y-m-d'));

        $hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $statusLabel = ['izin' => 'Izin', 'sakit' => 'Sakit', 'alpa' => 'Alpa'];
        $namaSiswa = $pklPlacement->student?->user?->name ?? '-';
        $namaSekolah = Setting::get('nama_sekolah', '');

        $phpWord = new PhpWord();
        $section = $phpWord->addSection([
            'marginTop' => 850, 'marginBottom' => 850, 'marginLeft' => 1400, 'marginRight' => 850,
        ]);

        $section->addText(strtoupper($namaSekolah), ['bold' => true, 'size' => 11]);
        $section->addText('JURNAL PRAKTIK KERJA LAPANGAN ' . $tahun, ['bold' => true, 'size' => 9]);
        $section->addTextBreak(1);
        $section->addText('DAFTAR HADIR PESERTA PKL', ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);

        $section->addText('Nama Murid              : ' . $namaSiswa);
        $section->addText('Kompetensi Keahlian     : ' . ($pklPlacement->student?->classRoom?->name ?? '-'));
        $section->addText('Tempat PKL/Nama Iduka   : ' . ($pklPlacement->dudi?->nama_perusahaan ?? '-'));
        $section->addText('Bulan                   : ' . $bulanNama[$bulanNum - 1] . ' ' . $tahun);
        $section->addTextBreak(1);

        $tableStyle = ['borderSize' => 6, 'borderColor' => '999999', 'cellMargin' => 80];
        $headerStyle = ['bgColor' => 'EAF2FC', 'bold' => true];
        $table = $section->addTable($tableStyle);

        $table->addRow();
        $table->addCell(2200)->addText('Hari, tanggal', $headerStyle);
        $table->addCell(1300)->addText('Datang', $headerStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(1300)->addText('Pulang', $headerStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(2000)->addText('Ket. Tidak Hadir', $headerStyle, ['alignment' => Jc::CENTER]);
        $table->addCell(2200)->addText('Paraf Instruktur', $headerStyle, ['alignment' => Jc::CENTER]);

        $jumlahHari = (int) date('t', mktime(0, 0, 0, $bulanNum, 1, $tahun));
        for ($tgl = 1; $tgl <= $jumlahHari; $tgl++) {
            $dateStr = sprintf('%04d-%02d-%02d', $tahun, $bulanNum, $tgl);
            $namaHari = $hari[date('w', strtotime($dateStr))];
            $row = $attendances[$dateStr] ?? null;

            $table->addRow();
            $table->addCell(2200)->addText($namaHari . ', ' . $tgl);
            $table->addCell(1300)->addText($row?->time_in ? substr($row->time_in, 0, 5) : '', [], ['alignment' => Jc::CENTER]);
            $table->addCell(1300)->addText($row?->time_out ? substr($row->time_out, 0, 5) : '', [], ['alignment' => Jc::CENTER]);
            $table->addCell(2000)->addText($row && $row->status !== 'hadir' ? ($statusLabel[$row->status] ?? '') : '', [], ['alignment' => Jc::CENTER]);
            $table->addCell(2200)->addText($row?->verified_at ? '✓' : '', [], ['alignment' => Jc::CENTER]);
        }

        $section->addTextBreak(1);
        $section->addText('Keterangan pengisian:', ['bold' => true]);
        $section->addListItem('Satu halaman ini untuk daftar hadir 1 bulan', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Daftar hadir diisi oleh perorangan/individu masing-masing', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Kolom hari/tanggal diisi hari dan tanggal pelaksanaan', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Absensi kerja diisi berdasarkan jam datang dan jam pulang', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Kolom keterangan tidak hadir diisi jika peserta PKL tidak hadir', 0, null, ListItemStyle::TYPE_ALPHANUM);
        $section->addListItem('Paraf diisi oleh Instruktur Dunia Kerja', 0, null, ListItemStyle::TYPE_ALPHANUM);

        $namaFile = 'Absensi-PKL-' . preg_replace('/[^A-Za-z0-9\-]/', '-', $namaSiswa) . '-' . $bulanNama[$bulanNum - 1] . '-' . $tahun . '.docx';

        $tempPath = storage_path('app/temp-' . uniqid() . '.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Buat atau perbaiki 1 baris absensi secara manual — dipakai guru pembimbing,
     * DUDI, atau admin. Dipakai untuk mencatat izin/sakit/alpa, atau memperbaiki
     * kesalahan input siswa.
     */
    public function koreksi(Request $request)
    {
        $data = $request->validate([
            'pkl_placement_id' => 'required|exists:pkl_placements,id',
            'date'             => 'required|date',
            'status'           => 'required|in:hadir,izin,sakit,alpa',
            'time_in'          => 'nullable|date_format:H:i',
            'time_out'         => 'nullable|date_format:H:i',
            'catatan_koreksi'  => 'nullable|string|max:500',
        ]);

        $placement = PklPlacement::findOrFail($data['pkl_placement_id']);
        if (!$this->bolehLihat($placement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang mengoreksi absensi siswa ini.'], 403);
        }

        $absensi = PklAttendance::firstOrNew([
            'pkl_placement_id' => $placement->id,
            'date'             => $data['date'],
        ]);

        $absensi->student_id       = $placement->student_id;
        $absensi->status           = $data['status'];
        $absensi->time_in          = $data['time_in'] ?? $absensi->time_in;
        $absensi->time_out         = $data['time_out'] ?? $absensi->time_out;
        $absensi->corrected_by     = $request->user()->id;
        $absensi->catatan_koreksi  = $data['catatan_koreksi'] ?? null;
        $absensi->save();

        return response()->json(['message' => 'Absensi berhasil dikoreksi.', 'absensi' => $absensi->fresh()]);
    }

    public function hapus(Request $request, PklAttendance $pklAttendance)
    {
        if (!$this->bolehLihat($pklAttendance->placement, $request->user())) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus absensi ini.'], 403);
        }
        if ($pklAttendance->verified_at) {
            return response()->json(['message' => 'Absensi ini sudah diverifikasi IDUKA, tidak bisa dihapus lagi.'], 422);
        }

        $pklAttendance->delete();

        return response()->json(['message' => 'Absensi berhasil dihapus.']);
    }

    /**
     * Verifikasi (paraf digital) 1 baris absensi — cuma boleh DUDI pemilik
     * penempatan ini atau admin. Menandai absensi hari itu sudah dianggap sah.
     */
    public function verifikasi(Request $request, PklAttendance $pklAttendance)
    {
        $placement = $pklAttendance->placement;
        if (!$this->bolehVerifikasi($placement, $request->user())) {
            return response()->json(['message' => 'Hanya DUDI atau admin yang bisa memverifikasi absensi ini.'], 403);
        }

        $pklAttendance->verified_by = $request->user()->id;
        $pklAttendance->verified_at = now();
        $pklAttendance->save();

        return response()->json([
            'message'  => 'Absensi berhasil diverifikasi.',
            'absensi'  => $pklAttendance->fresh('verifiedBy'),
        ]);
    }

    /**
     * Semua absensi yang BELUM diverifikasi milik DUDI yang sedang login,
     * dari semua siswa magangnya sekaligus — dipakai panel "Verifikasi Absensi"
     * di dashboard DUDI supaya tidak perlu buka satu-satu per siswa.
     */
    public function pendingVerifikasi(Request $request)
    {
        $dudi = $request->user()->dudi;
        if (!$dudi) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil DUDI.'], 404);
        }

        return PklAttendance::with('student.user', 'student.classRoom')
            ->whereNull('verified_at')
            ->whereHas('placement', fn ($q) => $q->where('dudi_id', $dudi->id))
            ->orderBy('date')
            ->get();
    }
}
