<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        return Setting::orderBy('id')->get();
    }

    public function update(Request $request)
    {
        $request->validate([
            'jam_masuk_mulai' => 'required|date_format:H:i',
            'jam_masuk_batas' => 'required|date_format:H:i',
            'jam_masuk_tutup' => 'required|date_format:H:i',
            'poin_telat'      => 'required|integer|min:0|max:100',
            'poin_alpa'       => 'required|integer|min:0|max:100',
        ], [
            'date_format' => 'Format jam harus HH:MM (contoh: 07:30).',
        ]);

        if ($request->jam_masuk_mulai >= $request->jam_masuk_batas) {
            return response()->json(['message' => 'Jam mulai absen harus sebelum batas tepat waktu.'], 422);
        }
        if ($request->jam_masuk_batas >= $request->jam_masuk_tutup) {
            return response()->json(['message' => 'Batas tepat waktu harus sebelum jam tutup absen.'], 422);
        }

        Setting::set('jam_masuk_mulai', $request->jam_masuk_mulai);
        Setting::set('jam_masuk_batas', $request->jam_masuk_batas);
        Setting::set('jam_masuk_tutup', $request->jam_masuk_tutup);
        Setting::set('poin_telat', (string) $request->poin_telat);
        Setting::set('poin_alpa', (string) $request->poin_alpa);

        return response()->json([
            'message'  => 'Pengaturan berhasil disimpan.',
            'settings' => Setting::orderBy('id')->get(),
        ]);
    }
}
