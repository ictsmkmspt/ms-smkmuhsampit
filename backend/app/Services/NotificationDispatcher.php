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

    /**
     * URL portal per role — dipakai trigger yang menyasar penerima lintas
     * role sekaligus (mis. pengumuman ke semua orang), supaya tiap
     * penerima diarahkan ke portalnya sendiri, bukan 1 url yang sama untuk
     * semua. Cermin dashboardPathForRole() di frontend/src/pages/Login.jsx
     * — kalau daftar role di sana berubah, samakan juga di sini.
     */
    public static function urlForRole(string $role): string
    {
        return match ($role) {
            'admin', 'waka' => '/admin',
            'waka_kesiswaan' => '/waka-kesiswaan',
            'waka_kurikulum' => '/waka-kurikulum',
            'waka_humas' => '/waka-humas',
            'waka_sarpras' => '/waka-sarpras',
            'guru' => '/guru',
            'wali' => '/wali',
            'instruktur' => '/instruktur',
            'iduka' => '/iduka',
            'tu' => '/tu',
            'teknisi', 'kepala_bengkel' => '/staf-ruang',
            'bk' => '/bk',
            'pustakawan' => '/perpustakaan-staff',
            'kepala_sekolah' => '/kepala-sekolah',
            'pengawas_ujian' => '/ujian',
            default => '/siswa',
        };
    }

    /**
     * Kirim ke banyak user LINTAS ROLE sekaligus (mis. broadcast
     * pengumuman) — dikelompokkan per role dulu supaya tiap kelompok
     * diarahkan ke url portalnya sendiri lewat urlForRole().
     */
    public static function sendManyAcrossRoles(iterable $users, string $category, string $title, ?string $body = null, array $data = []): int
    {
        $total = 0;
        foreach (collect($users)->filter()->unique('id')->groupBy('role') as $role => $group) {
            $total += static::sendMany($group, $category, $title, $body, static::urlForRole($role), $data);
        }
        return $total;
    }
}
