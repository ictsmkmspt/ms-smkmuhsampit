<?php

namespace App\Imports;

use App\Models\Dudi;
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

class DudiImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
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
     * Dipanggil untuk setiap baris yang LOLOS validasi di rules(). Akun login
     * dibuat dari kolom "penanggung_jawab" (nama instruktur) + "telepon" —
     * sama seperti form Tambah Akun IDUKA manual di DudiTab.jsx.
     */
    public function model(array $row)
    {
        $this->successCount++;

        return DB::transaction(function () use ($row) {
            $password = !empty($row['password']) ? trim((string) $row['password']) : '123456';
            $user = User::create([
                'name'     => trim($row['penanggung_jawab']),
                'phone'    => trim($row['telepon']),
                'password' => bcrypt($password),
                'role'     => 'dudi',
            ]);

            return Dudi::create([
                'user_id'          => $user->id,
                'nama_perusahaan'  => $row['nama_perusahaan'],
                'alamat'           => $row['alamat'] ?? null,
                'penanggung_jawab' => trim($row['penanggung_jawab']),
                'telepon'          => trim($row['telepon']),
                'latitude'         => $row['latitude'],
                'longitude'        => $row['longitude'],
                'radius_meter'     => !empty($row['radius_meter']) ? (int) $row['radius_meter'] : 100,
            ]);
        });
    }

    public function rules(): array
    {
        return [
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'required|string|max:100',
            'telepon'          => 'required|string|max:30|unique:users,phone',
            'password'         => 'nullable|min:6',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'radius_meter'     => 'nullable|integer|min:10|max:5000',
        ];
    }

    public function customValidationMessages()
    {
        return [
            'nama_perusahaan.required'  => 'Nama perusahaan wajib diisi.',
            'penanggung_jawab.required' => 'Nama penanggung jawab/instruktur wajib diisi.',
            'telepon.required'          => 'No. HP wajib diisi.',
            'telepon.unique'            => 'No. HP sudah dipakai akun lain.',
            'password.min'              => 'Password minimal 6 karakter.',
            'latitude.required'         => 'Latitude wajib diisi.',
            'latitude.between'         => 'Latitude harus di antara -90 dan 90.',
            'longitude.required'        => 'Longitude wajib diisi.',
            'longitude.between'        => 'Longitude harus di antara -180 dan 180.',
            'radius_meter.min'          => 'Radius minimal 10 meter.',
            'radius_meter.max'          => 'Radius maksimal 5000 meter.',
        ];
    }
}
