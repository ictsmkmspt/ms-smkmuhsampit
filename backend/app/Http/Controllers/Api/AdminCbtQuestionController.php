<?php

namespace App\Http\Controllers\Api;

use App\Exports\CbtQuestionTemplateExport;
use App\Http\Controllers\Api\Concerns\SaringHtmlCbt;
use App\Http\Controllers\Controller;
use App\Imports\CbtQuestionsImport;
use App\Models\CbtBankSoal;
use App\Models\CbtQuestion;
use App\Models\TahunAjaran;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Bank Soal — versi Admin/Waka Kurikulum. Beda dari CbtQuestionController
 * (dipakai guru, selalu dibatasi ke teacher_id milik akun yang login),
 * controller ini dipakai admin/kurikulum untuk melihat & mengelola Bank
 * Soal GURU MANAPUN — teacher_id datang eksplisit dari request (dipilih
 * dulu di menu "CBT" lewat pemilih Guru), bukan diambil dari akun yang
 * login (admin tidak punya baris Teacher sendiri).
 */
class AdminCbtQuestionController extends Controller
{
    use SaringHtmlCbt;

    private const ATURAN_KONTEN = 'required|string|max:2000000';

    private function teacherPunyaMapel(int $teacherId, int $subjectId): bool
    {
        return TeachingAssignment::where('teacher_id', $teacherId)
            ->where('subject_id', $subjectId)
            ->where('tahun_ajaran_id', TahunAjaran::aktifId())
            ->exists();
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'bank_id' => 'nullable|exists:cbt_bank_soal,id',
        ]);

        return CbtQuestion::where('teacher_id', $data['teacher_id'])
            ->when(!empty($data['subject_id']), fn ($q) => $q->where('subject_id', $data['subject_id']))
            ->when(!empty($data['bank_id']), fn ($q) => $q->where('bank_id', $data['bank_id']))
            ->with('subject', 'bank')
            ->orderByDesc('id')
            ->get();
    }

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
            ['teacher_id' => 'required|exists:teachers,id', 'bank_id' => 'required|exists:cbt_bank_soal,id', 'audio' => 'nullable|file|mimes:mp3,wav,ogg,m4a|max:10240'],
            $this->aturanSoal()
        ));

        $bank = CbtBankSoal::where('id', $data['bank_id'])->where('teacher_id', $data['teacher_id'])->first();
        if (!$bank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik guru ini.'], 422);
        }

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
        $data = $request->validate(array_merge(
            ['bank_id' => 'required|exists:cbt_bank_soal,id'],
            $this->aturanSoal()
        ));

        $bank = CbtBankSoal::where('id', $data['bank_id'])->where('teacher_id', $cbtQuestion->teacher_id)->first();
        if (!$bank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik guru ini.'], 422);
        }
        $data['subject_id'] = $bank->subject_id;
        $data = $this->saringSemuaKonten($data);

        $cbtQuestion->update($data);

        return $cbtQuestion->fresh();
    }

    public function uploadAudio(Request $request, CbtQuestion $cbtQuestion)
    {
        $request->validate(['audio' => 'required|file|mimes:mp3,wav,ogg,m4a|max:10240']);

        if ($cbtQuestion->audio_path) {
            Storage::disk('public')->delete($cbtQuestion->audio_path);
        }
        $cbtQuestion->update(['audio_path' => $request->file('audio')->store('cbt-soal-audio', 'public')]);

        return $cbtQuestion->fresh();
    }

    public function removeAudio(CbtQuestion $cbtQuestion)
    {
        if ($cbtQuestion->audio_path) {
            Storage::disk('public')->delete($cbtQuestion->audio_path);
            $cbtQuestion->update(['audio_path' => null]);
        }

        return $cbtQuestion->fresh();
    }

    public function destroy(CbtQuestion $cbtQuestion)
    {
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

    public function import(Request $request)
    {
        $data = $request->validate([
            'teacher_id' => 'required|exists:teachers,id',
            'bank_id' => 'required|exists:cbt_bank_soal,id',
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $bank = CbtBankSoal::where('id', $data['bank_id'])->where('teacher_id', $data['teacher_id'])->first();
        if (!$bank) {
            return response()->json(['message' => 'Bank Soal tidak ditemukan atau bukan milik guru ini.'], 422);
        }

        $import = new CbtQuestionsImport((int) $data['teacher_id'], (int) $data['bank_id'], $bank->subject_id);
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
