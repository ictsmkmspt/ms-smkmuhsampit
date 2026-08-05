<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Batas umum semua endpoint /api — per user login kalau sudah
        // autentikasi, per IP kalau masih tamu (mis. sebelum login).
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Percobaan login dibatasi ketat & dua lapis supaya brute-force —
        // baik menyasar 1 akun tertentu maupun menyapu banyak akun dari 1
        // IP — sama-sama kena batas: 5x/menit per (identitas login + IP),
        // dan 20x/menit per IP terlepas dari akun yang dicoba.
        RateLimiter::for('login', function (Request $request) {
            $identitas = Str::lower((string) $request->input('login'));

            return [
                Limit::perMinute(5)->by($identitas.'|'.$request->ip()),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });
    }
}
