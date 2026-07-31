<?php

namespace App\Imports;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class WaliImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;

    public $successCount = 0;

    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    public function model(array $row)
    {
        return DB::transaction(function () use ($row) {
            $phone = trim((string) $row['no_hp']);

            $wali = User::where('role', 'wali')->where('phone', $phone)->first();

            if (!$wali) {
                $password = !empty($row['password']) ? trim((string) $row['password']) : '123456';
                $wali = User::create([
                    'name'     => $row['nama'],
                    'phone'    => $phone,
                    'password' => bcrypt($password),
                    'role'     => 'wali',
                ]);
            }

            if (!empty($row['nis_siswa'])) {
                $student = Student::where('nis', trim((string) $row['nis_siswa']))->first();
                if ($student) {
                    $wali->children()->syncWithoutDetaching([
                        $student->id => ['hubungan' => $row['hubungan'] ?? null],
                    ]);
                }
            }

            $this->successCount++;

            return $wali;
        });
    }

    public function rules(): array
    {
        return [
            'nama'      => 'required|string|max:100',
            'no_hp'     => 'required|string|max:20',
            'password'  => 'nullable|min:6',
            'nis_siswa' => ['nullable', function ($attribute, $value, $fail) {
                if (!empty($value) && !Student::where('nis', trim($value))->exists()) {
                    $fail("NIS \"$value\" tidak ditemukan di Master Data Siswa.");
                }
            }],
            'hubungan'  => 'nullable|string|max:50',
        ];
    }

    public function customValidationMessages()
    {
        return [
            'nama.required'    => 'Nama wajib diisi.',
            'no_hp.required'   => 'No. HP wajib diisi.',
            'password.min'     => 'Password minimal 6 karakter (atau kosongkan saja untuk pakai default).',
        ];
    }
}
