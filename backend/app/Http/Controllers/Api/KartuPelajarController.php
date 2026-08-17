<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * Pengaturan tampilan Kartu Pelajar (3 warna: utama/aksen/abu-abu) —
 * disimpan terpusat lewat Setting (bukan localStorage per perangkat lagi),
 * supaya semua yang mencetak kartu pakai warna yang sama. Dikelola admin
 * lewat menu Pengaturan > Kartu Pelajar, dibaca halaman cetak
 * (PrintKartuPelajar) setiap kali dibuka.
 */
class KartuPelajarController extends Controller
{
    private const WARNA_DEFAULT = [
        'warna_utama' => '#0B1B3A',
        'warna_aksen' => '#F2B705',
        'warna_abu' => '#94A3B8',
    ];

    private const JUDUL_BELAKANG_DEFAULT = 'Ketentuan Kartu Pelajar';

    // Satu baris = satu poin ketentuan di sisi belakang kartu (pola sama
    // seperti field Misi di Profil Sekolah) — ini isi default kalau
    // pengaturannya belum pernah diubah admin.
    private const KETENTUAN_DEFAULT = "Kartu ini milik pribadi siswa yang bersangkutan.\nWajib dibawa selama berada di lingkungan sekolah.\nJika ditemukan, mohon dikembalikan ke pihak sekolah.";

    public function show()
    {
        return response()->json([
            'warna_utama' => Setting::get('kartu_pelajar_warna_utama', self::WARNA_DEFAULT['warna_utama']),
            'warna_aksen' => Setting::get('kartu_pelajar_warna_aksen', self::WARNA_DEFAULT['warna_aksen']),
            'warna_abu' => Setting::get('kartu_pelajar_warna_abu', self::WARNA_DEFAULT['warna_abu']),
            'judul_belakang' => Setting::get('kartu_pelajar_judul_belakang', self::JUDUL_BELAKANG_DEFAULT),
            'ketentuan' => Setting::get('kartu_pelajar_ketentuan', self::KETENTUAN_DEFAULT),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'warna_utama' => 'required|regex:/^#[0-9A-Fa-f]{6}$/',
            'warna_aksen' => 'required|regex:/^#[0-9A-Fa-f]{6}$/',
            'warna_abu' => 'required|regex:/^#[0-9A-Fa-f]{6}$/',
            'judul_belakang' => 'required|string|max:100',
            'ketentuan' => 'nullable|string|max:2000',
        ], [
            'regex' => 'Format warna tidak valid.',
        ]);

        Setting::set('kartu_pelajar_warna_utama', $data['warna_utama']);
        Setting::set('kartu_pelajar_warna_aksen', $data['warna_aksen']);
        Setting::set('kartu_pelajar_warna_abu', $data['warna_abu']);
        Setting::set('kartu_pelajar_judul_belakang', $data['judul_belakang']);
        Setting::set('kartu_pelajar_ketentuan', $data['ketentuan'] ?? '');

        return response()->json(['message' => 'Pengaturan Kartu Pelajar berhasil disimpan.']);
    }
}
