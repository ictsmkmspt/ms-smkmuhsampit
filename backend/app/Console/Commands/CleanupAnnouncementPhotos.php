<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Dijadwalkan harian (lihat routes/console.php) — foto pengumuman cuma
 * disimpan 30 hari sejak pengumuman dibuat supaya storage server tidak
 * terus membengkak. Teks pengumumannya sendiri TIDAK ikut dihapus, cuma
 * fotonya (kolom foto di-null-kan setelah file-nya dihapus).
 */
class CleanupAnnouncementPhotos extends Command
{
    protected $signature = 'announcements:cleanup-photos';
    protected $description = 'Hapus foto pengumuman yang sudah lebih dari 30 hari (teksnya tetap disimpan)';

    public function handle(): int
    {
        // Pakai foto_uploaded_at (waktu foto benar-benar diunggah/diganti),
        // BUKAN created_at (waktu baris pengumuman dibuat) — pengumuman
        // lama bisa saja baru diganti fotonya lewat uploadFoto(), dan
        // created_at-nya tidak pernah ikut berubah. Kalau dulu pakai
        // created_at, foto yang baru saja diunggah pada pengumuman lama
        // bisa langsung terhapus di jadwal pembersihan berikutnya.
        $kadaluarsa = Announcement::whereNotNull('foto')
            ->where('foto_uploaded_at', '<', now()->subDays(30))
            ->get();

        foreach ($kadaluarsa as $announcement) {
            Storage::disk('public')->delete($announcement->foto);
            $announcement->update(['foto' => null, 'foto_uploaded_at' => null]);
        }

        $this->info("{$kadaluarsa->count()} foto pengumuman (lebih dari 30 hari) dihapus.");

        return self::SUCCESS;
    }
}
