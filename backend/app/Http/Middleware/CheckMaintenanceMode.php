<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menegakkan mode maintenance di sisi API — didaftarkan GLOBAL di
 * bootstrap/app.php (bukan cuma di grup auth:sanctum), supaya cara ini
 * tidak bisa dilewati dengan memanggil endpoint yang kebetulan di luar
 * grup auth:sanctum. Karena middleware ini bisa jalan SEBELUM middleware
 * route auth:sanctum resmi diproses, resolusi usernya sengaja pakai guard
 * 'sanctum' langsung (bukan $request->user() polos yang ikut guard
 * default 'web') — Sanctum tetap bisa membaca Bearer token-nya lepas dari
 * urutan middleware.
 *
 * /login SENGAJA dikecualikan di sini (biar request-nya sampai ke
 * AuthController::login()) — penolakan login non-admin ditangani DI SANA,
 * bukan di sini, karena baru ketahuan role-nya SETELAH kredensial
 * diverifikasi (middleware generik ini tidak tahu siapa yang mau login).
 */
class CheckMaintenanceMode
{
    private const RUTE_DIKECUALIKAN = [
        'api/maintenance-status',
        'api/login',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (Setting::get('maintenance_mode', '0') !== '1') {
            return $next($request);
        }

        if ($request->is(self::RUTE_DIKECUALIKAN)) {
            return $next($request);
        }

        $user = $request->user('sanctum');
        if ($user && $user->role === 'admin') {
            return $next($request);
        }

        return response()->json([
            'message' => 'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.',
            'maintenance' => true,
        ], 503);
    }
}
