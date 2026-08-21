<?php

namespace App\Imports;

use App\Http\Controllers\Api\Concerns\SaringHtmlCbt;
use App\Models\CbtQuestion;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

/**
 * Impor soal massal ke Bank Soal dari Excel — 1 file cuma untuk 1 wadah
 * Bank Soal (dipilih di frontend sebelum upload, bukan per-baris) supaya
 * tetap konsisten dengan store() manual yang juga selalu 1 soal = 1 wadah.
 * teacher_id, bank_id & subject_id (subject_id ikut wadahnya) datang dari
 * constructor (bukan kolom di file), dipakai baik oleh guru (teacher_id
 * miliknya sendiri) maupun admin (teacher_id guru yang dipilih) — lihat
 * CbtQuestionController::import() & AdminCbtQuestionController::import().
 */
class CbtQuestionsImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;
    use SaringHtmlCbt;

    public $successCount = 0;

    public function __construct(private int $teacherId, private int $bankId, private int $subjectId)
    {
    }

    /**
     * Paksa semua isi kolom dibaca sebagai teks — supaya "jawaban_benar"
     * seperti "A" tidak pernah disalahartikan Excel jadi hal lain, dan
     * angka pada "pertanyaan"/pilihan tidak diformat ulang.
     */
    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    public function model(array $row)
    {
        $tipe = strtolower(trim($row['tipe']));
        $isPg = $tipe === 'pg';

        $this->successCount++;

        return new CbtQuestion([
            'teacher_id' => $this->teacherId,
            'bank_id' => $this->bankId,
            'subject_id' => $this->subjectId,
            'tipe' => $tipe,
            'pertanyaan' => $this->saringHtml(trim($row['pertanyaan'])),
            'pilihan_a' => $isPg ? $this->saringHtml(trim($row['pilihan_a'] ?? '')) : null,
            'pilihan_b' => $isPg ? $this->saringHtml(trim($row['pilihan_b'] ?? '')) : null,
            'pilihan_c' => $isPg ? $this->saringHtml(trim($row['pilihan_c'] ?? '')) : null,
            'pilihan_d' => $isPg ? $this->saringHtml(trim($row['pilihan_d'] ?? '')) : null,
            'pilihan_e' => ($isPg && !empty($row['pilihan_e'])) ? $this->saringHtml(trim($row['pilihan_e'])) : null,
            'jawaban_benar' => $isPg ? strtoupper(trim($row['jawaban_benar'])) : null,
            'tingkat_kesulitan' => strtolower(trim($row['tingkat_kesulitan'])),
        ]);
    }

    public function rules(): array
    {
        return [
            'tipe' => 'required|in:pg,PG,Pg,essay,Essay,ESSAY',
            'pertanyaan' => 'required|string',
            'pilihan_a' => 'required_if:tipe,pg,PG,Pg|nullable|string',
            'pilihan_b' => 'required_if:tipe,pg,PG,Pg|nullable|string',
            'pilihan_c' => 'required_if:tipe,pg,PG,Pg|nullable|string',
            'pilihan_d' => 'required_if:tipe,pg,PG,Pg|nullable|string',
            'pilihan_e' => 'nullable|string',
            'jawaban_benar' => 'required_if:tipe,pg,PG,Pg|nullable|in:A,B,C,D,E,a,b,c,d,e',
            'tingkat_kesulitan' => 'required|in:mudah,Mudah,MUDAH,sedang,Sedang,SEDANG,sulit,Sulit,SULIT',
        ];
    }

    public function customValidationMessages()
    {
        return [
            'tipe.required' => 'Tipe soal wajib diisi ("pg" atau "essay").',
            'tipe.in' => 'Tipe soal harus "pg" atau "essay".',
            'pertanyaan.required' => 'Pertanyaan wajib diisi.',
            'pilihan_a.required_if' => 'Pilihan A wajib diisi untuk soal pilihan ganda.',
            'pilihan_b.required_if' => 'Pilihan B wajib diisi untuk soal pilihan ganda.',
            'pilihan_c.required_if' => 'Pilihan C wajib diisi untuk soal pilihan ganda.',
            'pilihan_d.required_if' => 'Pilihan D wajib diisi untuk soal pilihan ganda.',
            'jawaban_benar.required_if' => 'Jawaban benar wajib diisi (A-E) untuk soal pilihan ganda.',
            'jawaban_benar.in' => 'Jawaban benar harus salah satu dari A, B, C, D, E.',
            'tingkat_kesulitan.required' => 'Tingkat kesulitan wajib diisi.',
            'tingkat_kesulitan.in' => 'Tingkat kesulitan harus "mudah", "sedang", atau "sulit".',
        ];
    }
}
