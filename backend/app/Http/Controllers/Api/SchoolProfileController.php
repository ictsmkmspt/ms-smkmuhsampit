<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SchoolProfileController extends Controller
{
    /**
     * Publik (tanpa login) — dipakai halaman Login, favicon, dan judul tab
     * browser, yang semuanya perlu tampil SEBELUM user login.
     */
    public function show()
    {
        $logo = Setting::get('logo_sekolah', '');

        return response()->json([
            'nama_sekolah' => Setting::get('nama_sekolah', 'SMK Muhammadiyah Sampit'),
            'visi' => Setting::get('visi', ''),
            'misi' => Setting::get('misi', ''),
            'logo_url' => $logo ? '/storage/' . $logo : null,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'nama_sekolah' => 'required|string|max:150',
            'visi' => 'nullable|string|max:2000',
            'misi' => 'nullable|string|max:4000',
        ]);

        Setting::set('nama_sekolah', $data['nama_sekolah']);
        Setting::set('visi', $data['visi'] ?? '');
        Setting::set('misi', $data['misi'] ?? '');

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
}
