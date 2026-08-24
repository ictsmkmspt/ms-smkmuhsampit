<?php

namespace App\Providers;

use App\Models\Student;
use App\Models\Teacher;
use App\Services\ActivityLogger;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Relations\Relation;
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
        // Peminjam buku perpustakaan bisa Siswa ATAU Guru (relasi
        // polimorfik) — alias pendek dipakai (bukan nama kelas lengkap)
        // supaya kolom peminjam_type di DB tetap ringkas & tidak terikat
        // ke namespace kalau model dipindah nanti.
        Relation::morphMap([
            'siswa' => Student::class,
            'guru' => Teacher::class,
        ]);

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

        // Formulir PPDB publik tidak pakai auth sama sekali (calon siswa
        // belum punya akun) — batas umum 120x/menit punya /api global
        // terlalu longgar untuk formulir pendaftaran, jadi dibatasi lebih
        // ketat lagi khusus endpoint ini: per menit (mencegah bot ngebut)
        // dan per hari (mencegah spam pelan-pelan yang menghindari batas
        // per menit).
        RateLimiter::for('ppdb-daftar', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
                Limit::perDay(15)->by($request->ip()),
            ];
        });

        // Cek status pendaftaran PPDB (publik, tanpa auth) — kodenya acak
        // ~2,2 milyar kombinasi jadi tebak-tebakan brute-force tetap tidak
        // praktis, tapi endpoint ini sebelumnya sama sekali tidak dibatasi
        // (beda dari /ppdb/daftar), jadi tetap dikasih batas wajar untuk
        // jaga-jaga terhadap enumerasi/scraping otomatis.
        RateLimiter::for('ppdb-status', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        // Catatan pindah-tab/blur saat ujian CBT dikirim otomatis dari
        // browser siswa — batasi supaya event yang salah dikonfigurasi
        // (mis. loop) tidak membanjiri tabel log.
        RateLimiter::for('cbt-events', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        $this->registerActivityLogging();
    }

    /**
     * Log Aktivitas admin ("betul-betul semua kegiatan", bukan cuma aksi
     * "penting") — didaftarkan sekali di sini untuk SEMUA model app,
     * bukan diinstrumentasi manual di tiap controller (61 model x 88
     * controller tidak realistis dijaga konsisten manual, dan gampang ada
     * yang terlewat). Daftar class di bawah SENGAJA eksplisit (bukan
     * glob/scan direktori Models tiap request) — lebih murah & lebih
     * jelas model mana saja yang tercakup. ActivityLog sendiri SENGAJA
     * tidak didaftarkan di sini supaya tidak logging-tentang-logging
     * berulang tanpa henti.
     */
    private function registerActivityLogging(): void
    {
        $models = [
            \App\Models\AcademicEvent::class, \App\Models\AcademicScore::class,
            \App\Models\Achievement::class, \App\Models\AchievementType::class,
            \App\Models\Announcement::class, \App\Models\Asset::class,
            \App\Models\Attendance::class, \App\Models\BkCase::class,
            \App\Models\Buku::class, \App\Models\BukuEksemplar::class,
            \App\Models\CbtBankSoal::class, \App\Models\CbtExam::class,
            \App\Models\CbtExamAnswer::class, \App\Models\CbtExamAttempt::class,
            \App\Models\CbtExamAuditLog::class, \App\Models\CbtExamQuestion::class,
            \App\Models\CbtMateri::class, \App\Models\CbtQuestion::class,
            \App\Models\CbtTabSwitchLog::class, \App\Models\CbtTujuanPembelajaran::class,
            \App\Models\ClassRoom::class, \App\Models\Holiday::class,
            \App\Models\Iduka::class, \App\Models\Jurusan::class,
            \App\Models\LaboratoriumKunjungan::class, \App\Models\MaintenanceRequest::class,
            \App\Models\Notification::class, \App\Models\PeriodTemplate::class,
            \App\Models\PerpustakaanKategori::class, \App\Models\PerpustakaanKunjungan::class,
            \App\Models\PerpustakaanPeminjaman::class, \App\Models\PerpustakaanRak::class,
            \App\Models\PklAttendance::class, \App\Models\PklJournal::class,
            \App\Models\PklMonitoringJadwal::class, \App\Models\PklPembimbinganJournal::class,
            \App\Models\PklPenilaian::class, \App\Models\PklPenilaianKompetensi::class,
            \App\Models\PklPlacement::class, \App\Models\PpdbPendaftar::class,
            \App\Models\PrayerAttendance::class, \App\Models\Room::class,
            \App\Models\SanksiKejadian::class, \App\Models\SanksiRule::class,
            \App\Models\Schedule::class, \App\Models\Setting::class,
            \App\Models\Spp::class, \App\Models\SppPembayaran::class,
            \App\Models\Student::class, \App\Models\Subject::class,
            \App\Models\TadarusScore::class, \App\Models\TagihanLain::class,
            \App\Models\TagihanLainPembayaran::class, \App\Models\TahfidzScore::class,
            \App\Models\TahsinScore::class, \App\Models\TahunAjaran::class,
            \App\Models\Teacher::class, \App\Models\TeachingAssignment::class,
            \App\Models\User::class, \App\Models\Violation::class,
            \App\Models\ViolationType::class,
        ];

        foreach ($models as $class) {
            $class::created(fn ($model) => ActivityLogger::catat('dibuat', $model));
            $class::updated(fn ($model) => ActivityLogger::catat('diubah', $model));
            $class::deleted(fn ($model) => ActivityLogger::catat('dihapus', $model));
        }
    }
}
