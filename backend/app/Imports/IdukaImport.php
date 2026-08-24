<?php

namespace App\Imports;

use App\Models\Iduka;
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

class IdukaImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;

    public $successCount = 0;

    /**
     * Paksa SEMUA isi kolom dibaca sebagai teks (bukan angka), supaya no HP
     * tidak diubah otomatis oleh Excel jadi angka, sama seperti StudentsImport.
     */
    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    /**
     * Dipanggil untuk setiap baris yang LOLOS validasi di rules(). Tiap baris
     * bikin 1 perusahaan mitra BARU sekaligus 1 akun Instruktur yang
     * mewakilinya — akun login dibuat dari kolom "nama_instruktur" + "telepon"
     * (email opsional, disiapkan untuk login ke fitur BKK nanti), sama seperti
     * form Tambah Instruktur manual di InstrukturTab.jsx (bedanya di sana
     * perusahaannya dipilih dari yang sudah ada, di sini selalu baru per
     * baris import).
     */
    public function model(array $row)
    {
        $this->successCount++;

        return DB::transaction(function () use ($row) {
            $iduka = Iduka::create([
                'nama_perusahaan'  => $row['nama_perusahaan'],
                'alamat'           => $row['alamat'] ?? null,
                'telepon'          => trim($row['telepon']),
                'latitude'         => $row['latitude'],
                'longitude'        => $row['longitude'],
                'radius_meter'     => !empty($row['radius_meter']) ? (int) $row['radius_meter'] : 100,
            ]);

            $password = !empty($row['password']) ? trim((string) $row['password']) : '123456';
            User::create([
                'name'     => trim($row['nama_instruktur']),
                'phone'    => trim($row['telepon']),
                'email'    => !empty($row['email']) ? trim($row['email']) : null,
                'password' => bcrypt($password),
                'role'     => 'instruktur',
                'iduka_id' => $iduka->id,
            ]);

            return $iduka;
        });
    }

    public function rules(): array
    {
        return [
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'nama_instruktur'  => 'required|string|max:100',
            'telepon'          => 'required|string|max:30|unique:users,phone',
            'email'            => 'nullable|email|max:150|unique:users,email',
            'password'         => 'nullable|min:6',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'radius_meter'     => 'nullable|integer|min:10|max:5000',
        ];
    }

    public function customValidationMessages()
    {
        return [
            'nama_perusahaan.required' => 'Nama perusahaan wajib diisi.',
            'nama_instruktur.required' => 'Nama instruktur wajib diisi.',
            'telepon.required'         => 'No. HP wajib diisi.',
            'telepon.unique'           => 'No. HP sudah dipakai akun lain.',
            'email.email'              => 'Format email tidak valid.',
            'email.unique'             => 'Email sudah dipakai akun lain.',
            'password.min'             => 'Password minimal 6 karakter.',
            'latitude.required'        => 'Latitude wajib diisi.',
            'latitude.between'         => 'Latitude harus di antara -90 dan 90.',
            'longitude.required'       => 'Longitude wajib diisi.',
            'longitude.between'        => 'Longitude harus di antara -180 dan 180.',
            'radius_meter.min'         => 'Radius minimal 10 meter.',
            'radius_meter.max'         => 'Radius maksimal 5000 meter.',
        ];
    }
}
