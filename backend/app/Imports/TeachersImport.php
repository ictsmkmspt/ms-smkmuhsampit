<?php

namespace App\Imports;

use App\Models\Teacher;
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

class TeachersImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;

    /**
     * Dihitung setiap kali 1 baris berhasil disimpan (lolos validasi).
     */
    public $successCount = 0;

    /**
     * Paksa SEMUA isi kolom dibaca sebagai teks (bukan angka), supaya NIP tidak
     * diubah otomatis oleh Excel jadi angka (yang bisa kepotong/berubah presisinya
     * kalau angkanya panjang, dan bikin validasi 'string' gagal).
     */
    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    /**
     * Dipanggil untuk setiap baris data (baris 1 = judul kolom, jadi tidak dihitung di sini).
     * $row sudah otomatis dikelompokkan berdasarkan nama kolom (nama, email, password, nip)
     * karena pakai WithHeadingRow.
     */
    public function model(array $row)
    {
        $this->successCount++;

        return DB::transaction(function () use ($row) {
            $user = User::create([
                'name'     => $row['nama'],
                'email'    => $row['email'],
                'password' => bcrypt($row['password']),
                'role'     => 'guru',
            ]);

            return Teacher::create([
                'user_id' => $user->id,
                'nip'     => $row['nip'],
            ]);
        });
    }

    /**
     * Validasi tiap baris. Baris yang gagal TIDAK menghentikan proses baris lainnya —
     * cukup dicatat lewat SkipsOnFailure, lalu bisa diambil via $import->failures().
     */
    public function rules(): array
    {
        return [
            'nama'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'nip'      => 'required|string|unique:teachers,nip',
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
            'nip.required'      => 'NIP wajib diisi.',
            'nip.unique'        => 'NIP sudah terdaftar.',
        ];
    }
}
