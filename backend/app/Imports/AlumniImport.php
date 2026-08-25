<?php

namespace App\Imports;

use App\Models\Jurusan;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
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

/**
 * Import alumni (bukan siswa aktif) — semua baris masuk ke SATU kelas
 * alumni yang dipilih di AlumniTab sebelum upload (beda dari
 * StudentsImport yang kolom "kelas" per-baris, di sini class_room_id
 * sudah pasti/sama untuk semua baris jadi tidak perlu kolom kelas).
 * Kolom sengaja diminimalkan (nama, nis, jurusan, tanggal_lulus) — data
 * legacy alumni lama biasanya cuma punya info ini. Email/NISN/tanggal
 * lahir TIDAK diminta (alumni login pakai NIS, lihat
 * StudentController::store()) — konsekuensinya AlumniLookupController::cariNis()
 * cuma bisa cari lewat NIS, bukan lewat nisn+tanggal_lahir seperti siswa
 * yang datanya lengkap.
 */
class AlumniImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;

    public $successCount = 0;

    public function __construct(private int $classRoomId)
    {
    }

    /**
     * Paksa semua isi kolom dibaca sebagai teks (bukan angka) — pola sama
     * seperti StudentsImport, supaya NIS tidak diubah otomatis oleh Excel
     * jadi angka.
     */
    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    public function model(array $row)
    {
        $this->successCount++;

        return DB::transaction(function () use ($row) {
            $jurusanId = null;
            if (!empty($row['jurusan'])) {
                $jurusanInput = trim($row['jurusan']);
                $jurusanId = Jurusan::where('kode', $jurusanInput)->orWhere('nama', $jurusanInput)->first()?->id;
            }

            $user = User::create([
                'name'     => $row['nama'],
                'email'    => null,
                'password' => bcrypt('123456'),
                'role'     => 'siswa',
            ]);

            return Student::create([
                'user_id'       => $user->id,
                'class_room_id' => $this->classRoomId,
                'jurusan_id'    => $jurusanId,
                'nis'           => $row['nis'],
                'status'        => 'lulus',
                'tanggal_lulus' => $this->parseTanggal($row['tanggal_lulus'] ?? null) ?? now()->toDateString(),
                'qr_code'       => 'STD-' . strtoupper(Str::random(8)),
            ]);
        });
    }

    /**
     * Terima tanggal dalam format YMD ("2003-05-17") ATAU DMY
     * ("17/05/2003", "17-05-2003") — dicoba satu-satu supaya user tidak
     * perlu ikuti 1 format kaku di Excel, lalu dinormalkan ke Y-m-d
     * sebelum disimpan ke kolom date.
     */
    private function parseTanggal(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        foreach (['Y-m-d', 'd/m/Y', 'd-m-Y', 'd.m.Y'] as $format) {
            try {
                $date = Carbon::createFromFormat('!' . $format, $value);
            } catch (\Exception $e) {
                continue;
            }
            // createFromFormat() sendirian TIDAK menolak tanggal kalender
            // tidak valid (mis. "31-02-2003" diam-diam digeser jadi
            // 2003-03-03, bukan error) — getLastErrors() yang mendeteksi
            // overflow ini, supaya baris dengan salah ketik tanggal gagal
            // divalidasi (masuk daftar "gagal") alih-alih tersimpan dengan
            // tanggal yang salah tanpa disadari.
            $errors = \DateTime::getLastErrors();
            if ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
                continue;
            }
            return $date->toDateString();
        }

        return null;
    }

    public function rules(): array
    {
        return [
            'nama'          => 'required|string|max:100',
            'nis'           => 'required|string|unique:students,nis',
            'jurusan'       => ['nullable', function ($attribute, $value, $fail) {
                $valueTrim = trim($value ?? '');
                if ($valueTrim !== '' && !Jurusan::where('kode', $valueTrim)->orWhere('nama', $valueTrim)->exists()) {
                    $fail("Jurusan \"$value\" tidak ditemukan di Pengaturan (dicocokkan lewat kode atau nama). Cek ejaan atau tambahkan jurusannya dulu.");
                }
            }],
            'tanggal_lulus' => ['nullable', function ($attribute, $value, $fail) {
                if (!empty($value) && !$this->parseTanggal($value)) {
                    $fail('Format tanggal tidak dikenali — gunakan YYYY-MM-DD (mis. 2003-05-17) atau DD/MM/YYYY (mis. 17/05/2003).');
                }
            }],
        ];
    }

    public function customValidationMessages()
    {
        return [
            'nama.required' => 'Nama wajib diisi.',
            'nis.required'  => 'NIS wajib diisi.',
            'nis.unique'    => 'NIS sudah terdaftar.',
        ];
    }
}
