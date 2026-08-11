<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * IDUKA sekarang login pakai No. HP (dudis.telepon), bukan email lagi —
 * pindahkan nomor yang sudah ada ke users.phone (dipakai AuthController::login)
 * dan kosongkan email supaya tidak ada 2 cara login yang membingungkan. Kalau
 * suatu akun DUDI belum punya nomor telepon sama sekali, email-nya SENGAJA
 * dibiarkan supaya akun itu tidak langsung terkunci — admin harus isi No. HP
 * dulu lewat menu Kelola IDUKA sebelum email lama itu bisa/perlu dihapus.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->join('dudis', 'dudis.user_id', '=', 'users.id')
            ->where('users.role', 'dudi')
            ->whereNotNull('dudis.telepon')
            ->where('dudis.telepon', '!=', '')
            ->whereNull('users.phone')
            ->select('users.id as user_id', 'dudis.telepon')
            ->get()
            ->each(function ($row) {
                // Kolom users.phone unik — lewati kalau ternyata nomor itu
                // sudah kepakai user lain, biar migrasi tidak gagal total.
                $bentrok = DB::table('users')->where('phone', $row->telepon)->exists();
                if (!$bentrok) {
                    DB::table('users')->where('id', $row->user_id)->update([
                        'phone' => $row->telepon,
                        'email' => null,
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Data backfill satu arah — tidak ada email lama yang bisa dipulihkan.
    }
};
