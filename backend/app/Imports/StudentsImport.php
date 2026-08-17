<?php

namespace App\Imports;

use App\Models\ClassRoom;
use App\Models\Jurusan;
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

            $jurusanId = null;
            if (!empty($row['jurusan'])) {
                $jurusanInput = trim($row['jurusan']);
                $jurusan = Jurusan::where('kode', $jurusanInput)->orWhere('nama', $jurusanInput)->first();
                $jurusanId = $jurusan?->id;
            }

            $password = !empty($row['password']) ? trim((string) $row['password']) : '123456';
            $user = User::create([
                'name'     => $row['nama'],
                'email'    => $row['email'],
                'password' => bcrypt($password),
                'role'     => 'siswa',
            ]);

            return Student::create([
                'user_id'       => $user->id,
                'class_room_id' => $classRoomId,
                'jurusan_id'    => $jurusanId,
                'nis'           => $row['nis'],
                'jenis_kelamin' => !empty($row['jenis_kelamin']) ? strtoupper(trim($row['jenis_kelamin'])) : null,
                'tempat_lahir'  => !empty($row['tempat_lahir']) ? trim($row['tempat_lahir']) : null,
                'tanggal_lahir' => !empty($row['tanggal_lahir']) ? trim($row['tanggal_lahir']) : null,
                'alamat'        => !empty($row['alamat']) ? trim($row['alamat']) : null,
                'qr_code'  => 'STD-' . strtoupper(Str::random(8)),
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
            'password' => 'nullable|min:6',
            'nis'      => 'required|string|unique:students,nis',
            'jenis_kelamin' => 'nullable|in:L,P,l,p',
            'kelas'    => ['nullable', function ($attribute, $value, $fail) {
                if (!empty($value) && !ClassRoom::where('name', trim($value))->exists()) {
                    $fail("Kelas \"$value\" tidak ditemukan di Master Data. Cek ejaan atau tambahkan kelasnya dulu.");
                }
            }],
            'jurusan'  => ['nullable', function ($attribute, $value, $fail) {
                $valueTrim = trim($value ?? '');
                if ($valueTrim !== '' && !Jurusan::where('kode', $valueTrim)->orWhere('nama', $valueTrim)->exists()) {
                    $fail("Jurusan \"$value\" tidak ditemukan di Pengaturan (dicocokkan lewat kode atau nama). Cek ejaan atau tambahkan jurusannya dulu.");
                }
            }],
            'tempat_lahir'  => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'alamat'        => 'nullable|string|max:300',
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
            'jenis_kelamin.in'  => 'Jenis kelamin harus diisi "L" atau "P" saja.',
            'tanggal_lahir.date' => 'Format tanggal lahir tidak valid — gunakan format YYYY-MM-DD.',
        ];
    }
}
