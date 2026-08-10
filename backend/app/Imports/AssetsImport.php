<?php

namespace App\Imports;

use App\Models\Asset;
use App\Models\Room;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\SkipsFailures;
use Maatwebsite\Excel\Concerns\SkipsOnFailure;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DataType;

class AssetsImport implements ToModel, WithHeadingRow, WithValidation, SkipsOnFailure, WithCustomValueBinder
{
    use SkipsFailures;

    public $successCount = 0;

    /**
     * Kalau yang import Kepala Bengkel, SEMUA baris dipaksa masuk ruang
     * tanggung jawabnya sendiri (kolom "ruang" di file diabaikan) — sama
     * seperti pembatasan di AssetController::store(). null artinya tidak
     * dibatasi (Admin/Waka Sarpras, pakai kolom "ruang" dari file).
     */
    public function __construct(private ?int $fixedRoomId = null)
    {
    }

    /**
     * Paksa semua isi kolom dibaca sebagai teks — supaya kode_aset yang
     * berupa angka panjang atau mengandung "/" tidak diubah otomatis oleh Excel.
     */
    public function bindValue(Cell $cell, $value)
    {
        $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        return true;
    }

    private function normalisasiTanggal(?string $v): ?string
    {
        $v = trim((string) $v);
        if ($v === '') {
            return null;
        }
        if (preg_match('/^\d{4}$/', $v)) {
            return $v . '-01-01';
        }
        try {
            return Carbon::parse($v)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function model(array $row)
    {
        $this->successCount++;

        $roomId = $this->fixedRoomId;
        if ($roomId === null && !empty($row['ruang'])) {
            $roomId = Room::where('nama', trim($row['ruang']))->first()?->id;
        }

        $baik = (int) ($row['jumlah_baik'] ?? 0);
        $rusakRingan = (int) ($row['jumlah_rusak_ringan'] ?? 0);
        $rusakBerat = (int) ($row['jumlah_rusak_berat'] ?? 0);
        // Kalau ketiganya kosong (kolom tidak diisi sama sekali), anggap
        // 1 barang kondisi baik — supaya baris tidak gagal cuma gara-gara
        // lupa isi salah satu kolom jumlah.
        if ($baik + $rusakRingan + $rusakBerat === 0) {
            $baik = 1;
        }

        return new Asset([
            'nama' => $row['nama'],
            'merk_model' => $row['merk_model'] ?? null,
            'no_seri_pabrik' => $row['no_seri_pabrik'] ?? null,
            'ukuran' => $row['ukuran'] ?? null,
            'bahan' => $row['bahan'] ?? null,
            'tanggal_perolehan' => $this->normalisasiTanggal($row['tanggal_perolehan'] ?? null),
            'kode_aset' => $row['kode_barang'],
            'jumlah_baik' => $baik,
            'jumlah_rusak_ringan' => $rusakRingan,
            'jumlah_rusak_berat' => $rusakBerat,
            'room_id' => $roomId,
            'keterangan' => $row['keterangan'] ?? null,
        ]);
    }

    public function rules(): array
    {
        return [
            'kode_barang' => 'required|string|max:50|unique:assets,kode_aset',
            'nama' => 'required|string|max:150',
            'jumlah_baik' => 'nullable|integer|min:0',
            'jumlah_rusak_ringan' => 'nullable|integer|min:0',
            'jumlah_rusak_berat' => 'nullable|integer|min:0',
            'ruang' => ['nullable', function ($attribute, $value, $fail) {
                if ($this->fixedRoomId === null && !empty($value) && !Room::where('nama', trim($value))->exists()) {
                    $fail("Ruang \"$value\" tidak ditemukan di Master Data. Cek ejaan atau tambahkan ruangnya dulu.");
                }
            }],
        ];
    }

    public function customValidationMessages()
    {
        return [
            'kode_barang.required' => 'Kode barang wajib diisi.',
            'kode_barang.unique' => 'Kode barang sudah dipakai aset lain.',
            'nama.required' => 'Nama aset wajib diisi.',
            'jumlah_baik.integer' => 'Jumlah Baik harus berupa angka.',
            'jumlah_rusak_ringan.integer' => 'Jumlah Rusak Ringan harus berupa angka.',
            'jumlah_rusak_berat.integer' => 'Jumlah Rusak Berat harus berupa angka.',
        ];
    }
}
