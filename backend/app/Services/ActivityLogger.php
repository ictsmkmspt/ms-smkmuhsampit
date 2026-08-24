<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Titik masuk tunggal untuk mencatat log aktivitas — dipanggil dari 2
 * tempat: hook event Eloquent global (created/updated/deleted, didaftarkan
 * di AppServiceProvider::boot() untuk semua model) dan manual dari
 * AuthController (login/logout, bukan event Eloquent).
 */
class ActivityLogger
{
    /**
     * Field yang namanya mengandung salah satu kata ini TIDAK PERNAH
     * ikut tersimpan di kolom `perubahan`, walau sudah ter-hash sekalipun
     * (mis. password) — murni jaga-jaga, bukan berarti field ini aman
     * disimpan mentah di tempat lain.
     */
    private const REDACT_KEYWORDS = ['password', 'token'];

    public static function catat(string $aksi, ?Model $model = null, array $extra = []): ActivityLog
    {
        $user = auth()->user();

        // $extra di-merge PALING TERAKHIR (menang atas nilai default) —
        // dipakai AuthController::login() untuk menyisipkan user_id/
        // actor_nama/actor_role manual, karena auth()->user() belum
        // terisi di rute /login yang memang publik (belum ada token).
        return ActivityLog::create(array_merge([
            'user_id' => $user?->id,
            'actor_nama' => $user?->name,
            'actor_role' => $user?->role,
            'aksi' => $aksi,
            'model_type' => $model ? class_basename($model) : null,
            'model_id' => $model?->getKey(),
            'model_label' => $model ? static::label($model) : null,
            'perubahan' => $aksi === 'diubah' && $model ? static::redact($model->getChanges()) : null,
        ], $extra));
    }

    /**
     * Deskripsi ringkas 1 baris model — best-effort, coba beberapa nama
     * kolom umum di codebase ini. Tidak perlu akurat 100% di semua 61
     * model, fallback ke "#id" kalau tidak ada field yang cocok.
     */
    private static function label(Model $model): string
    {
        foreach (['name', 'nama', 'nama_lengkap', 'judul', 'title', 'nama_perusahaan'] as $field) {
            if (!empty($model->{$field})) {
                return (string) $model->{$field};
            }
        }

        return '#' . $model->getKey();
    }

    private static function redact(array $perubahan): array
    {
        foreach ($perubahan as $key => $value) {
            foreach (self::REDACT_KEYWORDS as $kata) {
                if (str_contains(strtolower($key), $kata)) {
                    $perubahan[$key] = '••••••••';
                    break;
                }
            }
        }

        return $perubahan;
    }
}
