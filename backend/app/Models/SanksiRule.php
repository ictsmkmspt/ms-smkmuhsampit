<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SanksiRule extends Model
{
    protected $fillable = ['nama', 'min_poin', 'max_poin', 'tindakan', 'urutan'];

    /**
     * Aturan sanksi yang berlaku untuk sejumlah poin pelanggaran tertentu —
     * dipakai buat menentukan tahap sanksi siswa berdasarkan total_poin-nya.
     */
    public static function untukPoin(int $poin): ?self
    {
        return static::where('min_poin', '<=', $poin)
            ->where(function ($q) use ($poin) {
                $q->whereNull('max_poin')->orWhere('max_poin', '>=', $poin);
            })
            ->orderByDesc('min_poin')
            ->first();
    }
}
