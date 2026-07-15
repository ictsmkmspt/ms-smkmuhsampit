<?php

namespace App\Imports;

use App\Models\ClassRoom;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class StudentsImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;

    public $successCount = 0;

    /**
     * Paksa SEMUA isi kolom dibaca sebagai teks (bukan angka), supaya NIS tidak
     * diubah otomatis oleh Excel jadi angka (yang bisa kepotong/berubah presisinya
     * kalau angkanya panjang, dan bikin validasi 'string' gagal).
     */
    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    /**
     * Dipanggil untuk setiap baris data yang LOLOS validasi di rules().
     * Kolom "kelas" (nama kelas, misal "X TKJ") dicocokkan ke class_room_id.
     * Kalau kolom kelas dikosongkan, siswa dibuat tanpa kelas (boleh diatur nanti).
     */
    public function model(array $row)
    {
        $this->successCount++;

        return DB::transaction(function () use ($row) {
            $classRoomId = null;
            if (!empty($row['kelas'])) {
                $classRoom = ClassRoom::where('name', trim($row['kelas']))->first();
                $classRoomId = $classRoom?->id;
            }

            $user = User::create([
                'name'     => $row['nama'],
                'email'    => $row['email'],
                'password' => bcrypt($row['password']),
                'role'     => 'siswa',
            ]);

            return Student::create([
                'user_id'       => $user->id,
                'class_room_id' => $classRoomId,
                'nis'           => $row['nis'],
                'barcode_code'  => 'STD-' . strtoupper(Str::random(8)),
            ]);
        });
    }

    /**
     * Validasi tiap baris. Kolom "kelas" divalidasi lewat closure custom:
     * kalau diisi, nama kelasnya HARUS sudah ada di Master Data > Kelas.
     */
    public function rules(): array
    {
        return [
            'nama'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'nis'      => 'required|string|unique:students,nis',
            'kelas'    => ['nullable', function ($attribute, $value, $fail) {
                if (!empty($value) && !ClassRoom::where('name', trim($value))->exists()) {
                    $fail("Kelas \"$value\" tidak ditemukan di Master Data. Cek ejaan atau tambahkan kelasnya dulu.");
                }
            }],
        ];
    }

    public function customValidationMessages()
    {
        return [
            'nama.required'     => 'Nama wajib diisi.',
            'email.required'    => 'Email wajib diisi.',
            'email.email'       => 'Format email tidak valid.',
            'email.unique'      => 'Email sudah terdaftar.',
            'password.required' => 'Password wajib diisi.',
            'password.min'      => 'Password minimal 6 karakter.',
            'nis.required'      => 'NIS wajib diisi.',
            'nis.unique'        => 'NIS sudah terdaftar.',
        ];
    }
}
