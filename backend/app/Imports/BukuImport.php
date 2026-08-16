<?php

namespace App\Imports;

use App\Models\Buku;
use App\Models\PerpustakaanKategori;
use App\Models\PerpustakaanRak;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Import banyak buku sekaligus — pakai ToCollection (bukan ToModel) karena
 * 1 baris Excel menghasilkan 1 Buku + N BukuEksemplar sekaligus (sejumlah
 * kolom jumlah_eksemplar).
 */
class BukuImport implements ToCollection, WithHeadingRow
{
    public int $successCount = 0;

    /** @var array<int, array{baris:int, alasan:string}> */
    public array $gagal = [];

    public function __construct(private int $dibuatOleh)
    {
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $i => $row) {
            $baris = $i + 2; // +1 heading, +1 supaya 1-indexed sesuai baris Excel

            $judul = trim((string) ($row['judul'] ?? ''));
            if ($judul === '') {
                continue; // baris kosong, lewati diam-diam
            }

            $jumlahEksemplar = (int) ($row['jumlah_eksemplar'] ?? 0);
            if ($jumlahEksemplar < 0 || $jumlahEksemplar > 200) {
                $this->gagal[] = ['baris' => $baris, 'alasan' => 'jumlah_eksemplar harus antara 0-200.'];
                continue;
            }

            $kodeBuku = trim((string) ($row['kode_buku'] ?? '')) ?: null;
            if ($kodeBuku !== null && Buku::where('kode_buku', $kodeBuku)->exists()) {
                $this->gagal[] = ['baris' => $baris, 'alasan' => "kode_buku \"{$kodeBuku}\" sudah dipakai buku lain."];
                continue;
            }

            $namaKategori = trim((string) ($row['kategori'] ?? '')) ?: null;
            $kategoriId = null;
            if ($namaKategori !== null) {
                $kategoriId = PerpustakaanKategori::where('nama', $namaKategori)->value('id');
                if (!$kategoriId) {
                    $this->gagal[] = ['baris' => $baris, 'alasan' => "kategori \"{$namaKategori}\" belum ada di master data — tambahkan dulu lewat menu Pengaturan."];
                    continue;
                }
            }

            $namaRak = trim((string) ($row['rak_lokasi'] ?? '')) ?: null;
            $rakId = null;
            if ($namaRak !== null) {
                $rakId = PerpustakaanRak::where('nama', $namaRak)->value('id');
                if (!$rakId) {
                    $this->gagal[] = ['baris' => $baris, 'alasan' => "rak \"{$namaRak}\" belum ada di master data — tambahkan dulu lewat menu Pengaturan."];
                    continue;
                }
            }

            $buku = Buku::create([
                'judul' => $judul,
                'kode_buku' => $kodeBuku,
                'penulis' => trim((string) ($row['penulis'] ?? '')) ?: null,
                'penerbit' => trim((string) ($row['penerbit'] ?? '')) ?: null,
                'tahun_terbit' => $row['tahun_terbit'] ?? null,
                'isbn' => trim((string) ($row['isbn'] ?? '')) ?: null,
                'kategori_id' => $kategoriId,
                'rak_id' => $rakId,
                'dibuat_oleh' => $this->dibuatOleh,
            ]);

            for ($k = 0; $k < $jumlahEksemplar; $k++) {
                $buku->eksemplars()->create(['kode_eksemplar' => 'BUKU-' . strtoupper(Str::random(8))]);
            }

            $this->successCount++;
        }
    }
}
