<?php

namespace App\Console\Commands;

use App\Models\PerpustakaanPeminjaman;
use App\Services\NotificationDispatcher;
use Illuminate\Console\Command;

/**
 * Dijadwalkan harian (lihat routes/console.php) — cek peminjaman buku yang
 * statusnya masih "dipinjam" dan jatuh temponya BESOK (pengingat H-1) atau
 * KEMARIN (baru saja lewat jatuh tempo). Dipilih pas 2 tanggal ini saja
 * (bukan "semua yang sudah/akan jatuh tempo") supaya tiap peminjaman cuma
 * dinotifikasi sekali per momen walau command ini jalan tiap hari — tidak
 * perlu kolom penanda "sudah dinotif" tersendiri.
 */
class NotifJatuhTempoPeminjaman extends Command
{
    protected $signature = 'perpustakaan:notif-jatuh-tempo';
    protected $description = 'Kirim notifikasi pengingat H-1 dan baru-lewat jatuh tempo peminjaman buku';

    public function handle(): int
    {
        $besok = now()->addDay()->format('Y-m-d');
        $kemarin = now()->subDay()->format('Y-m-d');

        $jumlah = 0;

        $akanJatuhTempo = PerpustakaanPeminjaman::with('peminjam.user', 'eksemplar.buku')
            ->where('status', 'dipinjam')
            ->whereDate('tanggal_jatuh_tempo', $besok)
            ->get();
        foreach ($akanJatuhTempo as $p) {
            $user = $p->peminjam?->user;
            if (!$user) continue;
            $judul = $p->eksemplar?->buku?->judul ?? 'buku';
            NotificationDispatcher::send($user, 'perpustakaan', 'Buku jatuh tempo besok', "Buku \"{$judul}\" jatuh tempo besok ({$p->tanggal_jatuh_tempo}). Segera kembalikan.", null);
            $jumlah++;
        }

        $baruLewat = PerpustakaanPeminjaman::with('peminjam.user', 'eksemplar.buku')
            ->where('status', 'dipinjam')
            ->whereDate('tanggal_jatuh_tempo', $kemarin)
            ->get();
        foreach ($baruLewat as $p) {
            $user = $p->peminjam?->user;
            if (!$user) continue;
            $judul = $p->eksemplar?->buku?->judul ?? 'buku';
            NotificationDispatcher::send($user, 'perpustakaan', 'Buku terlambat dikembalikan', "Buku \"{$judul}\" sudah lewat jatuh tempo sejak {$p->tanggal_jatuh_tempo}. Segera kembalikan.", null);
            $jumlah++;
        }

        $this->info("{$jumlah} notifikasi jatuh tempo peminjaman terkirim.");

        return self::SUCCESS;
    }
}
