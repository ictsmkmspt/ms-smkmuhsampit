<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\NotificationDispatcher;
use Illuminate\Console\Command;

/**
 * Command dev-only untuk mengisi notifikasi contoh ke 1 user perwakilan
 * setiap role — dipakai untuk uji coba tampilan tombol lonceng di semua
 * dashboard tanpa perlu menunggu trigger bisnis nyata (alpa, pelanggaran,
 * dst — itu baru disambungkan di tahap berikutnya). TIDAK dijadwalkan
 * (tidak ada di routes/console.php), jalankan manual saat butuh saja:
 * php artisan notifications:simulasi
 */
class SimulasikanNotifikasi extends Command
{
    protected $signature = 'notifications:simulasi';

    protected $description = 'Isi notifikasi contoh untuk 1 user tiap role, buat demo tombol lonceng';

    public function handle(): int
    {
        $kepsek = User::firstOrCreate(
            ['email' => 'kepsek@sekolah.demo'],
            ['name' => 'Kepala Sekolah (Demo)', 'password' => bcrypt('demo123'), 'role' => 'kepala_sekolah']
        );
        $pengawas = User::firstOrCreate(
            ['email' => 'pengawas@sekolah.demo'],
            ['name' => 'Pengawas Ujian (Demo)', 'password' => bcrypt('demo123'), 'role' => 'pengawas_ujian']
        );

        $rencana = [
            ['role' => 'admin', 'url' => '/admin', 'items' => [
                ['bk', 'Kasus BK baru', 'Siswa AHMAD FAUZAN dieskalasi ke kasus BK setelah poin pelanggaran menembus ambang batas.', true],
                ['pelanggaran', 'Pelanggaran berat tercatat', 'Guru mencatat pelanggaran berat untuk siswa kelas X TKJ 1.', false],
                ['absensi', 'Rekap alpa hari ini', '12 siswa tercatat alpa hari ini — cek Laporan Absensi untuk detail.', true],
            ]],
            ['role' => 'waka_kesiswaan', 'url' => '/waka-kesiswaan', 'items' => [
                ['pelanggaran', 'Pelanggaran baru menunggu tindak lanjut', '3 siswa tercatat pelanggaran hari ini.', false],
                ['bk', 'Kasus BK baru', 'Kasus baru dibuat otomatis dari eskalasi poin pelanggaran.', true],
            ]],
            ['role' => 'waka_kurikulum', 'url' => '/waka-kurikulum', 'items' => [
                ['cbt', 'Jadwal ujian bentrok terdeteksi', 'Ujian Matematika kelas XI dan Bahasa Inggris kelas XI dijadwalkan di jam yang sama.', false],
                ['nilai', 'Laporan nilai semester selesai diinput', 'Semua guru sudah menyelesaikan input nilai semester ganjil.', true],
            ]],
            ['role' => 'waka_humas', 'url' => '/waka-humas', 'items' => [
                ['pengumuman', 'Pengumuman baru dari Guru', 'Ada pengumuman baru yang perlu ditinjau di papan pengumuman.', false],
            ]],
            ['role' => 'waka_sarpras', 'url' => '/waka-sarpras', 'items' => [
                ['maintenance', 'Permintaan perbaikan baru', 'AC ruang Lab Komputer 2 dilaporkan rusak oleh Teknisi.', false],
            ]],
            ['role' => 'guru', 'url' => '/guru', 'items' => [
                ['pkl', 'Jurnal PKL baru masuk', 'Siswa bimbingan Anda mengisi jurnal kegiatan PKL hari ini.', false],
                ['cbt', 'Jawaban essay menunggu dikoreksi', 'Ada 8 jawaban essay ujian yang belum dikoreksi.', false],
                ['cbt', 'Indikasi kecurangan terdeteksi', 'Siswa keluar dari tab ujian sebanyak 3 kali selama Ujian Tengah Semester.', true],
            ]],
            ['role' => 'siswa', 'url' => '/siswa', 'items' => [
                ['absensi', 'Kamu tercatat Alpa', 'Tanggal 22 Agustus 2026 kamu tercatat alpa tanpa keterangan.', false],
                ['nilai', 'Nilai baru diinput', 'Nilai Matematika kamu sudah diinput oleh guru.', false],
                ['prestasi', 'Prestasi baru dicatat', 'Kamu mendapat +10 poin prestasi karena Juara 2 Lomba LKS.', true],
                ['perpustakaan', 'Buku jatuh tempo', 'Buku "Pemrograman Web" jatuh tempo dikembalikan besok.', false],
                ['pengumuman', 'Pengumuman baru', 'Ada pengumuman baru dari sekolah, cek Beranda.', true],
            ]],
            ['role' => 'wali', 'url' => '/wali', 'items' => [
                ['absensi', 'DANIL tercatat hadir', 'Anak Anda DANIL discan hadir pukul 07:05.', true],
                ['spp', 'Tagihan SPP jatuh tempo', 'Tagihan SPP bulan ini untuk DANIL jatuh tempo dalam 3 hari.', false],
                ['pelanggaran', 'Pelanggaran tercatat', 'DANIL tercatat melakukan pelanggaran ringan hari ini, -5 poin.', false],
            ]],
            ['role' => 'instruktur', 'url' => '/instruktur', 'items' => [
                ['pkl', 'Siswa PKL baru ditempatkan', 'Siswa baru ditempatkan magang di perusahaan Anda.', true],
                ['pkl', 'Jurnal PKL siswa baru masuk', 'Siswa PKL bimbingan Anda mengisi jurnal kegiatan hari ini, perlu diberi catatan.', false],
            ]],
            ['role' => 'tu', 'url' => '/tu', 'items' => [
                ['spp', 'Pembayaran SPP masuk', 'Pembayaran SPP dari siswa AHMAD FAUZAN sebesar Rp500.000 tercatat lunas.', false],
                ['tagihan_lain', 'Pembayaran tagihan lain masuk', 'Pembayaran tagihan seragam tercatat.', true],
                ['ppdb', 'Pendaftar PPDB baru', 'Ada pendaftar baru lewat formulir PPDB online.', false],
            ]],
            ['role' => 'teknisi', 'url' => '/staf-ruang', 'items' => [
                ['maintenance', 'Permintaan perbaikan baru', 'Proyektor Ruang Kelas XI RPL 2 dilaporkan rusak.', false],
            ]],
            ['role' => 'kepala_bengkel', 'url' => '/staf-ruang', 'items' => [
                ['maintenance', 'Permintaan perbaikan baru di ruangmu', 'Ada laporan kerusakan baru di ruang yang jadi tanggung jawabmu.', false],
            ]],
            ['role' => 'bk', 'url' => '/bk', 'items' => [
                ['bk', 'Kasus BK baru ditugaskan', 'Kasus baru untuk siswa AHMAD FAUZAN perlu ditindaklanjuti.', false],
                ['sanksi', 'Eskalasi sanksi', 'Poin pelanggaran siswa menembus ambang — sanksi otomatis tercatat.', true],
            ]],
            ['role' => 'pustakawan', 'url' => '/perpustakaan-staff', 'items' => [
                ['perpustakaan', 'Buku terlambat dikembalikan', '3 buku terlambat dikembalikan minggu ini, perlu ditagih.', false],
            ]],
            ['role' => 'kepala_sekolah', 'url' => '/kepala-sekolah', 'items' => [
                ['ringkasan', 'Ringkasan mingguan sekolah', 'Kehadiran 95%, 2 kasus BK baru, pembayaran SPP terkumpul Rp45 juta minggu ini.', false],
            ]],
            ['role' => 'pengawas_ujian', 'url' => '/ujian', 'items' => [
                ['cbt', 'Jadwal pengawasan ujian', 'Anda ditugaskan mengawasi Ujian Tengah Semester kelas X besok pukul 08:00.', false],
                ['cbt', 'Kejadian mencurigakan selama ujian', 'Siswa terdeteksi keluar tab berulang kali saat ujian berlangsung.', true],
            ]],
        ];

        $total = 0;
        foreach ($rencana as $grup) {
            $user = User::where('role', $grup['role'])->first();
            if (!$user) {
                $this->warn("Lewati {$grup['role']} — tidak ada user.");
                continue;
            }

            foreach ($grup['items'] as [$category, $title, $body, $sudahDibaca]) {
                $notif = NotificationDispatcher::send($user, $category, $title, $body, $grup['url']);
                if ($sudahDibaca) {
                    $notif->update(['read_at' => now()->subHours(3)]);
                }
                $total++;
            }

            $this->line("✓ {$grup['role']} ({$user->name}): " . count($grup['items']) . ' notifikasi');
        }

        $this->info("Selesai — {$total} notifikasi contoh dibuat.");
        $this->line('Login demo baru: kepsek@sekolah.demo / demo123, pengawas@sekolah.demo / demo123');

        return self::SUCCESS;
    }
}
