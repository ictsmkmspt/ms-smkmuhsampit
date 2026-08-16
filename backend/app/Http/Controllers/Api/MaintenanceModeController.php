<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

/**
 * Mode maintenance — begitu dinyalakan, SELURUH role selain admin ditolak
 * (lihat middleware global CheckMaintenanceMode + guard tambahan di
 * AuthController::login() supaya non-admin bahkan tidak bisa login sama
 * sekali selama maintenance nyala, bukan cuma login-lalu-diblokir).
 */
class MaintenanceModeController extends Controller
{
    private const SETTING_KEY = 'maintenance_mode';

    /**
     * Publik (tanpa auth) — dicek SPA sebelum apa pun lain ditampilkan,
     * termasuk sebelum halaman Login sekalipun.
     */
    public function status()
    {
        return response()->json(['enabled' => Setting::get(self::SETTING_KEY, '0') === '1']);
    }

    public function update(Request $request)
    {
        $data = $request->validate(['enabled' => 'required|boolean']);

        Setting::set(self::SETTING_KEY, $data['enabled'] ? '1' : '0');

        return response()->json([
            'message' => $data['enabled']
                ? 'Mode maintenance dinyalakan — semua role selain admin sekarang ditolak akses.'
                : 'Mode maintenance dimatikan — akses normal untuk semua role.',
            'enabled' => $data['enabled'],
        ]);
    }
}
