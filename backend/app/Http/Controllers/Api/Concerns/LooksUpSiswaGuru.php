<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Student;
use App\Models\Teacher;

/**
 * Cari siswa/guru dari 1 kode (scan/ketik) atau sebagian nama — dipakai
 * fitur yang butuh 1 kotak cari yang sama untuk keduanya tanpa pengurus
 * perlu pilih tipe dulu (pola sama seperti
 * PerpustakaanSirkulasiController::cariPeminjamByKode/cariPeminjamNama,
 * diekstrak ke sini supaya bisa dipakai bareng oleh controller lain tanpa
 * menyalin ulang & tanpa mengutak-atik controller sirkulasi yang sudah
 * teruji).
 */
trait LooksUpSiswaGuru
{
    /**
     * @return array{tipe: string, model: Student|Teacher}|null
     */
    private function cariSiswaGuruByKode(string $kode): ?array
    {
        // status='aktif' — siswa alumni/pindah TIDAK boleh ketemu cuma
        // karena masih bawa kartu barcode lama.
        $siswa = Student::with(['user', 'classRoom'])
            ->where(fn ($q) => $q->where('barcode_code', $kode)->orWhere('nis', $kode))
            ->where('status', 'aktif')
            ->first();
        if ($siswa) {
            return ['tipe' => 'siswa', 'model' => $siswa];
        }

        $guru = Teacher::with('user')
            ->where(fn ($q) => $q->where('barcode_code', $kode)->orWhere('nip', $kode))
            ->first();
        if ($guru) {
            return ['tipe' => 'guru', 'model' => $guru];
        }

        return null;
    }

    /**
     * Cari lewat sebagian nama — gabungan siswa+guru, maksimal 10 hasil.
     */
    private function cariSiswaGuruByNama(string $q)
    {
        $siswa = Student::with(['user', 'classRoom'])
            ->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"))
            ->where('status', 'aktif')
            ->limit(10)->get()
            ->map(fn ($s) => $s->toArray() + ['tipe' => 'siswa']);

        $guru = Teacher::with('user')
            ->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"))
            ->limit(10)->get()
            ->map(fn ($g) => $g->toArray() + ['tipe' => 'guru']);

        return $siswa->concat($guru)->take(10)->values();
    }
}
