<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

/**
 * Titik masuk tunggal untuk membuat notifikasi in-app dari controller/model
 * manapun — supaya trigger baru (alpa, pelanggaran, pembayaran, dst, lihat
 * catatan implementasi notifikasi) cuma butuh 1 baris panggilan di sini,
 * bukan Notification::create() berulang di banyak tempat.
 */
class NotificationDispatcher
{
    public static function send(User $user, string $category, string $title, ?string $body = null, ?string $url = null, array $data = []): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'category' => $category,
            'title' => $title,
            'body' => $body,
            'url' => $url,
            'data' => $data,
        ]);
    }

    /**
     * 1 bulk insert untuk banyak user sekaligus (di-chunk per 200) — bukan
     * loop create() satu-satu, supaya trigger yang menyasar banyak
     * penerima (mis. semua wali di 1 kelas) tetap murah.
     */
    public static function sendMany(iterable $users, string $category, string $title, ?string $body = null, ?string $url = null, array $data = []): int
    {
        $now = now();

        $rows = collect($users)
            ->filter()
            ->unique('id')
            ->map(fn (User $user) => [
                'user_id' => $user->id,
                'category' => $category,
                'title' => $title,
                'body' => $body,
                'url' => $url,
                'data' => json_encode($data),
                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        foreach (array_chunk($rows, 200) as $chunk) {
            Notification::insert($chunk);
        }

        return count($rows);
    }
}
