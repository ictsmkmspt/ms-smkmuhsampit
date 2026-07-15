<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $fillable = ['date', 'keterangan'];

    /**
     * Cek apakah 1 tanggal adalah hari libur — baik karena akhir pekan (Sabtu/Minggu)
     * ATAU karena tercatat manual di tabel holidays (libur nasional, cuti bersama, dll).
     * Dipakai bersama di beberapa tempat (proses alpa, rekap absensi, dsb) supaya
     * logikanya konsisten dan cuma perlu ditulis sekali.
     */
    public static function isHariLibur(string $tanggal): bool
    {
        $date = Carbon::parse($tanggal);

        if ($date->isWeekend()) {
            return true;
        }

        return self::where('date', $date->format('Y-m-d'))->exists();
    }

    /**
     * Ambil keterangan hari libur untuk 1 tanggal (kalau ada), buat ditampilkan
     * di rekap ("Libur: Hari Kemerdekaan") supaya lebih informatif dari sekadar "Libur".
     */
    public static function keterangan(string $tanggal): ?string
    {
        $date = Carbon::parse($tanggal);

        $holiday = self::where('date', $date->format('Y-m-d'))->first();
        if ($holiday) {
            return $holiday->keterangan;
        }

        if ($date->isWeekend()) {
            return $date->isSaturday() ? 'Akhir Pekan (Sabtu)' : 'Akhir Pekan (Minggu)';
        }

        return null;
    }
}
