<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SchoolProfileController extends Controller
{
    /**
     * Publik (tanpa login) — dipakai halaman Login, favicon, dan judul tab
     * browser, yang semuanya perlu tampil SEBELUM user login. Sekalian
     * sertakan nama tahun ajaran aktif, supaya tampil juga di halaman Login.
     */
    public function show()
    {
        $logo = Setting::get('logo_sekolah', '');
        $ttd = Setting::get('ttd_kepala_sekolah', '');
        $cap = Setting::get('cap_sekolah', '');

        return response()->json([
            'nama_sekolah' => Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit'),
            'visi' => Setting::get('visi', ''),
            'misi' => Setting::get('misi', ''),
            'alamat' => Setting::get('alamat_sekolah', ''),
            'website' => Setting::get('website_sekolah', ''),
            'nama_kepala_sekolah' => Setting::get('nama_kepala_sekolah', ''),
            'nip_kepala_sekolah' => Setting::get('nip_kepala_sekolah', ''),
            'logo_url' => $logo ? '/storage/' . $logo : null,
            'ttd_kepala_sekolah_url' => $ttd ? '/storage/' . $ttd : null,
            'cap_sekolah_url' => $cap ? '/storage/' . $cap : null,
            'tahun_ajaran' => TahunAjaran::where('status', 'aktif')->value('nama'),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'nama_sekolah' => 'required|string|max:150',
            'visi' => 'nullable|string|max:2000',
            'misi' => 'nullable|string|max:4000',
            'alamat' => 'nullable|string|max:300',
            'website' => 'nullable|string|max:150',
            'nama_kepala_sekolah' => 'nullable|string|max:150',
            'nip_kepala_sekolah' => 'nullable|string|max:30',
        ]);

        Setting::set('nama_sekolah', $data['nama_sekolah']);
        Setting::set('visi', $data['visi'] ?? '');
        Setting::set('misi', $data['misi'] ?? '');
        Setting::set('alamat_sekolah', $data['alamat'] ?? '');
        Setting::set('website_sekolah', $data['website'] ?? '');
        Setting::set('nama_kepala_sekolah', $data['nama_kepala_sekolah'] ?? '');
        Setting::set('nip_kepala_sekolah', $data['nip_kepala_sekolah'] ?? '');

        return response()->json(['message' => 'Profil sekolah berhasil disimpan.']);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|max:2048',
        ]);

        $lama = Setting::get('logo_sekolah', '');
        if ($lama) {
            Storage::disk('public')->delete($lama);
        }

        $path = $request->file('logo')->store('logo-sekolah', 'public');
        Setting::set('logo_sekolah', $path);

        return response()->json([
            'message' => 'Logo sekolah berhasil disimpan.',
            'logo_url' => '/storage/' . $path,
        ]);
    }

    /**
     * TTD & cap SENGAJA dibatasi PNG saja (bukan "image" umum seperti logo)
     * — keduanya biasa dipakai ditempel transparan di atas dokumen cetak
     * (nota, surat, dst), jadi butuh latar belakang transparan yang cuma
     * bisa dijamin format PNG.
     */
    public function uploadTtdKepalaSekolah(Request $request)
    {
        $request->validate([
            'ttd' => 'required|mimes:png|max:2048',
        ]);

        $lama = Setting::get('ttd_kepala_sekolah', '');
        if ($lama) {
            Storage::disk('public')->delete($lama);
        }

        $path = $request->file('ttd')->store('ttd-kepala-sekolah', 'public');
        Setting::set('ttd_kepala_sekolah', $path);

        return response()->json([
            'message' => 'Tanda tangan kepala sekolah berhasil disimpan.',
            'ttd_kepala_sekolah_url' => '/storage/' . $path,
        ]);
    }

    public function uploadCapSekolah(Request $request)
    {
        $request->validate([
            'cap' => 'required|mimes:png|max:2048',
        ]);

        $lama = Setting::get('cap_sekolah', '');
        if ($lama) {
            Storage::disk('public')->delete($lama);
        }

        $path = $request->file('cap')->store('cap-sekolah', 'public');
        Setting::set('cap_sekolah', $path);

        return response()->json([
            'message' => 'Cap sekolah berhasil disimpan.',
            'cap_sekolah_url' => '/storage/' . $path,
        ]);
    }
}
