<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RestrictsGuruToOwnClass;
use App\Http\Controllers\Controller;
use App\Models\SanksiKejadian;
use App\Models\Setting;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

class SanksiKejadianController extends Controller
{
    use RestrictsGuruToOwnClass;

    /**
     * Daftar siswa yang pernah masuk tahap Sanksi Bertingkat — dibuat
     * otomatis oleh Student::tambahPoin() (lihat model), bukan dihitung
     * ulang tiap dibuka. status opsional: 'diproses' (baru/perlu
     * ditindaklanjuti) atau 'selesai'. Terikat tahun ajaran seperti
     * fitur lain: default ke tahun ajaran aktif, kecuali tahun_ajaran_id
     * dikirim eksplisit (dipakai Rekap BK Admin/Waka buat lihat tahun
     * lalu). Guru (wali kelas) dipaksa hanya lihat kelas walinya sendiri
     * (lihat RestrictsGuruToOwnClass) — dipakai menu Laporan > BK guru.
     */
    public function index(Request $request)
    {
        $query = SanksiKejadian::with(['student.user', 'student.classRoom', 'sanksiRule', 'diprosesOleh'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $query->where('tahun_ajaran_id', $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId());

        $restricted = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;
        if ($classRoomId) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        }

        return $query->get();
    }

    /**
     * Export Surat Peringatan ke file Word (.docx), meniru pola
     * PklPenilaianController::exportWord() — API PhpWord paling dasar
     * (addText biasa, tanpa HTML/tema font) supaya hasilnya konsisten
     * valid dibuka Microsoft Word. Nomor surat, tempat/tanggal, dan nama
     * & NIP Kepala Sekolah diisi manual dari form sebelum diunduh (bukan
     * data tersimpan), sama seperti pola tanda tangan export Nilai.
     * Tanda tangan sengaja HANYA Kepala Sekolah — tidak ada Guru BK
     * maupun Orang Tua/Wali di surat ini.
     */
    public function exportWord(Request $request, SanksiKejadian $sanksiKejadian)
    {
        $data = $request->validate([
            'nomor_surat' => 'nullable|string|max:100',
            'tempat' => 'nullable|string|max:50',
            'tanggal' => 'nullable|string|max:30',
            'kepsek_nama' => 'nullable|string|max:100',
            'kepsek_nip' => 'nullable|string|max:50',
        ]);

        $sanksiKejadian->load(['student.user', 'student.classRoom', 'sanksiRule']);
        $siswa = $sanksiKejadian->student;
        $tahap = $sanksiKejadian->sanksiRule;
        $namaSekolah = Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit');

        $phpWord = new PhpWord();
        $section = $phpWord->addSection([
            'marginTop' => 850, 'marginBottom' => 850, 'marginLeft' => 1400, 'marginRight' => 850,
        ]);

        $section->addText(strtoupper($namaSekolah), ['bold' => true, 'size' => 13], ['alignment' => Jc::CENTER]);
        $section->addText('SURAT PERINGATAN', ['bold' => true, 'size' => 13, 'underline' => 'single'], ['alignment' => Jc::CENTER]);
        $section->addText('Nomor: ' . ($data['nomor_surat'] ?? '..........................................'), [], ['alignment' => Jc::CENTER]);
        $section->addTextBreak(1);

        $section->addText('Sehubungan dengan pelanggaran tata tertib sekolah yang dilakukan oleh siswa berikut:');
        $section->addTextBreak(1);

        $section->addText('Nama                     : ' . ($siswa->user->name ?? '-'));
        $section->addText('NIS                      : ' . ($siswa->nis ?? '-'));
        $section->addText('Kelas                    : ' . ($siswa->classRoom->name ?? '-'));
        $section->addText('Total Poin Pelanggaran   : ' . $sanksiKejadian->total_poin_saat_itu);
        $section->addText('Tahap Sanksi             : ' . ($tahap->nama ?? '-'));
        $section->addTextBreak(1);

        $section->addText(
            'Berdasarkan poin pelanggaran yang telah dikumpulkan, siswa yang bersangkutan telah memasuki tahap sanksi bertingkat sebagaimana tercantum di atas. Sekolah memberikan ' . ($tahap->nama ?? 'peringatan') . ' dengan tindak lanjut sebagai berikut: ' . ($tahap->tindakan ?? 'pembinaan oleh Guru BK') . '.'
        );
        $section->addTextBreak(1);
        $section->addText(
            'Kami berharap siswa yang bersangkutan dapat memperbaiki sikap dan perilakunya. Apabila pelanggaran serupa masih dilakukan, sekolah akan memberikan sanksi lebih lanjut sesuai tata tertib yang berlaku, hingga sanksi tertinggi. Surat ini juga mohon menjadi perhatian Bapak/Ibu Orang Tua/Wali agar turut membimbing putra/putrinya di rumah.'
        );
        $section->addTextBreak(2);

        $tempat = $data['tempat'] ?? '.......................';
        $tanggal = $data['tanggal'] ?? '.......................';
        $section->addText($tempat . ', ' . $tanggal, [], ['alignment' => Jc::END]);
        $section->addText('Kepala Sekolah,', [], ['alignment' => Jc::END]);
        $section->addTextBreak(3);
        $section->addText($data['kepsek_nama'] ?? '(.....................................)', ['bold' => true], ['alignment' => Jc::END]);
        $section->addText('NIP. ' . ($data['kepsek_nip'] ?? '.....................................'), [], ['alignment' => Jc::END]);

        $namaFile = 'Surat-Peringatan-' . preg_replace('/[^A-Za-z0-9\-]/', '-', $siswa->user->name ?? 'Siswa') . '.docx';

        $tempPath = storage_path('app/temp-' . uniqid() . '.docx');
        $writer = IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $namaFile, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Tandai 1 kejadian sanksi selesai ditindaklanjuti — dicatat siapa &
     * kapan, plus catatan penyelesaian opsional (mis. ringkasan tindakan
     * yang sudah diambil).
     */
    public function selesaikan(Request $request, SanksiKejadian $sanksiKejadian)
    {
        if ($sanksiKejadian->status === 'selesai') {
            return response()->json(['message' => 'Kejadian ini sudah ditandai selesai sebelumnya.'], 422);
        }

        $data = $request->validate([
            'catatan_penyelesaian' => 'nullable|string',
        ]);

        $sanksiKejadian->update([
            'status' => 'selesai',
            'catatan_penyelesaian' => $data['catatan_penyelesaian'] ?? null,
            'diproses_oleh' => $request->user()->id,
            'selesai_at' => now(),
        ]);

        return $sanksiKejadian->fresh(['student.user', 'student.classRoom', 'sanksiRule', 'diprosesOleh']);
    }
}
