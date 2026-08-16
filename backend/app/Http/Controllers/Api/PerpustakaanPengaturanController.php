<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * Durasi pinjam default (hari) — dipegang admin, lewat Setting::get/set
 * (pola sama LmsPengaturanController), BUKAN SettingController yang
 * hardcoded ke field jam masuk.
 */
class PerpustakaanPengaturanController extends Controller
{
    public function index()
    {
        return response()->json([
            'perpus_durasi_pinjam_hari' => (int) Setting::get('perpus_durasi_pinjam_hari', '7'),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'perpus_durasi_pinjam_hari' => 'required|integer|min:1|max:90',
        ]);

        Setting::set('perpus_durasi_pinjam_hari', (string) $data['perpus_durasi_pinjam_hari']);

        return response()->json(['message' => 'Pengaturan durasi pinjam berhasil disimpan.', 'settings' => $data]);
    }
}
