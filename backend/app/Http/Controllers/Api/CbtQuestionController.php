<?php

namespace App\Http\Controllers\Api;

use App\Exports\CbtQuestionTemplateExport;
use App\Http\Controllers\Api\Concerns\SaringHtmlCbt;
use App\Http\Controllers\Controller;
use App\Imports\CbtQuestionsImport;
use App\Models\CbtBankSoal;
use App\Models\CbtQuestion;
use App\Models\TahunAjaran;
use App\Models\Teacher;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class CbtQuestionController extends Controller
{
    use SaringHtmlCbt;

    // Aturan validasi soal/pilihan sama persis di store() & update() —
    // isinya HTML dari editor TipTap (bisa ada gambar base64 di dalamnya),
    // bukan teks polos, jadi max karakternya digenerosikan (~2MB per
    // field) buat nampung 1-2 gambar wajar, bukan cuma 255 karakter teks.
    private const ATURAN_KONTEN = 'required|string|max:2000000';

    private function isOwnSubject(Request $request, int $subjectId): bool
    {
        $teacher = Teacher::where('user_id', $request->user()->id)->first();
        if (!$teacher) {
            return false;
        }

        return TeachingAssignment::where('teacher_id', $teacher->id)
            ->where('subject_id', $subjectId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->exists();
    }

    private function ownTeacherId(Request $request): ?int
    {
        return Teacher::where('user_id', $request->user()->id)->value('id');
    }

    /**
     * Bank Soal milik guru ini benar-benar miliknya — dicek tiap kali soal
     * dibuat/diubah supaya tidak bisa "menitipkan" soal ke Bank Soal guru
     * lain lewat request langsung ke API. Sama pola seperti
     * CbtMateriController::ownTp(), cuma tanpa guard tahun_ajaran_id
     * (Bank Soal, sama seperti soal di dalamnya, sengaja tidak terikat
     * tahun ajaran).
     */
    private function ownBank(Request $request, int $bankId): ?CbtBankSoal
    {
        return CbtBankSoal::where('id', $bankId)
            ->where('teacher_id', $this->ownTeacherId($request))
            ->first();
    }

    /**
     * subject_id & bank_id sengaja opsional — tanpa keduanya, kembalikan
     * semua soal milik guru ini lintas mapel/bank (dipakai tampilan Buat
     * Ujian yang perlu semua soal 1 mapel lintas Bank Soal sekaligus).
     * bank_id (kalau diisi) menyaring ke 1 Bank Soal saja — dipakai
     * tampilan Bank Soal yang sekarang per-wadah.
     *
     * SENGAJA tidak disaring per tahun_ajaran_id (beda dari Ujian/Latihan
     * yang memang terikat jadwal per tahun) — soal adalah konten yang
     * dipakai berulang tiap tahun, jadi kalau tahun ajaran ganti, Bank
     * Soal guru tidak boleh "hilang" dari tampilan dan harus ditulis
     * ulang dari nol. Kolom tahun_ajaran_id tetap ada di database sebagai
     * catatan kapan soal itu pertama dibuat, cuma tidak dipakai menyaring.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'subject_id' => 'nullable|exists:subjects,id',
            'bank_id' => 'nullable|exists:cbt_bank_soal,id',
        ]);

        if (!empty($data['subject_id']) && !$this->isOwnSubject($request, $data['subject_id'])) {
            return response()->json(['message' => 'Anda tidak punya Tugas Mengajar untuk mata pelajaran ini.'], 403);
        }

        return CbtQuestion::where('teacher_id', $this->ownTeacherId($request))
            ->when(!empty($data['subject_id']), fn ($q) => $q->where('subject_id', $data['subject_id']))
            ->when(!empty($data['bank_id']), fn ($q) => $q->where('bank_id', $data['bank_id']))
            ->with('subject', 'bank')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Aturan validasi bareng store()/update() — pilihan & jawaban_benar
     * cuma wajib kalau tipe soal "pg" (pilihan ganda); soal "essay" cuma
     * butuh pertanyaan + tingkat_kesulitan (dikoreksi manual guru, lihat
     * CbtEssayController). pilihan_e opsional di kedua tipe (soal boleh
     * 4 atau 5 pilihan). tingkat_kesulitan (mudah/sedang/sulit) menggantikan
     * bobot angka bebas — dipetakan tetap ke bobot lewat
     * CbtQuestion::BOBOT_MAP, lihat model.
     */
    private function aturanSoal(): array
    {
        return [
            'tipe' => 'required|in:pg,essay',
            'pertanyaan' => self::ATURAN_KONTEN,
            'pilihan_a' => 'nullable|required_if:tipe,pg|string|max:2000000',
            'pilihan_b' => 'nullable|required_if:tipe,pg|string|max:2000000',
            'pilihan_c' => 'nullable|required_if:tipe,pg|string|max:2000000',
            'pilihan_d' => 'nullable|required_if:tipe,pg|string|max:2000000',
            'pilihan_e' => 'nullable|string|max:2000000',
            'jawaban_benar' => 'nullable|required_if:tipe,pg|in:A,B,C,D,E',
            'tingkat_kesulitan' => 'required|in:mudah,sedang,sulit',
        ];
    }

    private function saringSemuaKonten(array $data): array
    {
        foreach (['pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'pilihan_e'] as $field) {
            if (!empty($data[$field])) {
                $data[$field] = $this->saringHtml($data[$field]);
            }
        }

        return $data;
    }

    public function store(Request $request)
    {
        $data = $request->validate(array_merge(
            ['bank_id' => 'required|exists:cbt_bank_soal,id', 'audio' => 'nullable|file|mimes:mp3,wav,ogg,m4a|max:10240'],
            $this->aturanSoal()
        ));

        $bank = $this->ownBank($request, $data['bank_id']);
        if (!$bank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik Anda.'], 403);
        }

        $data['teacher_id'] = $this->ownTeacherId($request);
        // Subject soal selalu ikut subject Bank Soal wadahnya — bukan
        // dipilih terpisah, supaya tidak mungkin soal "menyeberang" mapel
        // dari Bank Soal wadahnya (sama pola seperti Materi & TP-nya).
        $data['subject_id'] = $bank->subject_id;
        $data = $this->saringSemuaKonten($data);

        if ($request->hasFile('audio')) {
            $data['audio_path'] = $request->file('audio')->store('cbt-soal-audio', 'public');
        }
        unset($data['audio']);

        return response()->json(CbtQuestion::create($data), 201);
    }

    public function update(Request $request, CbtQuestion $cbtQuestion)
    {
        if ($cbtQuestion->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah soal ini.'], 403);
        }

        $data = $request->validate(array_merge(
            ['bank_id' => 'required|exists:cbt_bank_soal,id'],
            $this->aturanSoal()
        ));

        $bank = $this->ownBank($request, $data['bank_id']);
        if (!$bank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik Anda.'], 403);
        }
        $data['subject_id'] = $bank->subject_id;
        $data = $this->saringSemuaKonten($data);

        $cbtQuestion->update($data);

        return $cbtQuestion->fresh();
    }

    /**
     * Upload/ganti audio soal — endpoint TERPISAH dari update() (bukan
     * digabung 1 request PUT) karena PHP tidak mengisi $_FILES untuk
     * request PUT bermedia multipart — pola sama seperti
     * StudentController::uploadFoto() yang juga dipisah dari update().
     */
    public function uploadAudio(Request $request, CbtQuestion $cbtQuestion)
    {
        if ($cbtQuestion->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah soal ini.'], 403);
        }

        $request->validate(['audio' => 'required|file|mimes:mp3,wav,ogg,m4a|max:10240']);

        if ($cbtQuestion->audio_path) {
            Storage::disk('public')->delete($cbtQuestion->audio_path);
        }
        $cbtQuestion->update(['audio_path' => $request->file('audio')->store('cbt-soal-audio', 'public')]);

        return $cbtQuestion->fresh();
    }

    public function removeAudio(Request $request, CbtQuestion $cbtQuestion)
    {
        if ($cbtQuestion->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah soal ini.'], 403);
        }

        if ($cbtQuestion->audio_path) {
            Storage::disk('public')->delete($cbtQuestion->audio_path);
            $cbtQuestion->update(['audio_path' => null]);
        }

        return $cbtQuestion->fresh();
    }

    public function destroy(Request $request, CbtQuestion $cbtQuestion)
    {
        if ($cbtQuestion->teacher_id !== $this->ownTeacherId($request)) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus soal ini.'], 403);
        }

        if ($cbtQuestion->examQuestions()->exists()) {
            return response()->json(['message' => 'Soal ini sudah dipakai di sebuah ujian dan tidak bisa dihapus.'], 422);
        }

        if ($cbtQuestion->audio_path) {
            Storage::disk('public')->delete($cbtQuestion->audio_path);
        }

        $cbtQuestion->delete();

        return response()->json(['message' => 'Soal dihapus.']);
    }

    public function downloadTemplate()
    {
        return Excel::download(new CbtQuestionTemplateExport, 'template_import_soal.xlsx');
    }

    /**
     * Impor soal massal dari Excel — 1 file untuk 1 Bank Soal (dipilih di
     * frontend), soal essay/PG boleh dicampur dalam 1 file asal kolom
     * "tipe" per baris diisi benar. Baris yang gagal validasi dilewati
     * (tidak menggagalkan baris lain), rangkumannya dikembalikan lewat
     * $import->failures() — sama pola seperti TeacherController::import().
     */
    public function import(Request $request)
    {
        $data = $request->validate([
            'bank_id' => 'required|exists:cbt_bank_soal,id',
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $bank = $this->ownBank($request, $data['bank_id']);
        if (!$bank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik Anda.'], 403);
        }

        $import = new CbtQuestionsImport($this->ownTeacherId($request), (int) $data['bank_id'], $bank->subject_id);
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
            'message' => $import->successCount.' soal berhasil diimpor, '.count($gagal).' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal' => $gagal,
        ]);
    }
}
