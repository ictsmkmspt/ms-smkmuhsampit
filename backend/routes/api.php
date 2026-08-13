<?php

use App\Http\Controllers\Api\AcademicEventController;
use App\Http\Controllers\Api\AcademicScoreController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\TahsinScoreController;
use App\Http\Controllers\Api\TahfidzScoreController;
use App\Http\Controllers\Api\TadarusScoreController;
use App\Http\Controllers\Api\AchievementController;
use App\Http\Controllers\Api\AchievementTypeController;
use App\Http\Controllers\Api\AdminAccountController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BkAccountController;
use App\Http\Controllers\Api\BkCaseController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\DashboardChartController;
use App\Http\Controllers\Api\DudiController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\MaintenanceRequestController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PklAttendanceController;
use App\Http\Controllers\Api\PklJournalController;
use App\Http\Controllers\Api\PklPenilaianController;
use App\Http\Controllers\Api\PklPembimbinganJournalController;
use App\Http\Controllers\Api\PklMonitoringJadwalController;
use App\Http\Controllers\Api\PklPlacementController;
use App\Http\Controllers\Api\PeriodTemplateController;
use App\Http\Controllers\Api\PpdbController;
use App\Http\Controllers\Api\PrayerAttendanceController;
use App\Http\Controllers\Api\ProcurementController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\RoomStaffController;
use App\Http\Controllers\Api\SanksiKejadianController;
use App\Http\Controllers\Api\SanksiRuleController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\ScheduleExportController;
use App\Http\Controllers\Api\SchoolProfileController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SppController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentSelfController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\SystemBackupController;
use App\Http\Controllers\Api\TagihanLainController;
use App\Http\Controllers\Api\TahunAjaranController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\TeachingAssignmentController;
use App\Http\Controllers\Api\TuController;
use App\Http\Controllers\Api\ViolationTypeController;
use App\Http\Controllers\Api\WaliController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Publik (tanpa login) — dipakai halaman Login, favicon, dan judul tab
// browser, yang semuanya perlu tampil sebelum user berhasil login.
Route::get('/school-profile', [SchoolProfileController::class, 'show']);

// PPDB (Penerimaan Peserta Didik Baru) — calon siswa belum punya akun sama
// sekali, jadi formulir daftar & cek status WAJIB publik (tanpa auth:sanctum).
Route::post('/ppdb/daftar', [PpdbController::class, 'daftar']);
Route::get('/ppdb/status/{kode}', [PpdbController::class, 'status']);
Route::get('/ppdb/pengaturan', [PpdbController::class, 'pengaturan']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/password', [AuthController::class, 'changePassword']);
    Route::get('/leaderboard/prestasi', [AchievementController::class, 'leaderboard']);
    Route::post('/logout', [AuthController::class, 'logout']);
    // Data referensi 114 surah — dipakai guru (input Tadarus) maupun
    // siswa/wali (menampilkan nama surah di riwayat), jadi tidak dikunci
    // ke satu role tertentu.
    Route::get('/quran-surah', [TadarusScoreController::class, 'daftarSurah']);

    // Didaftarkan SEBELUM grup role:admin (yang punya apiResource('dudi', ...)
    // dengan rute wildcard /dudi/{dudi}) — supaya /dudi/profile & /dudi/tanda-tangan
    // (rute literal) tidak ketiban rute wildcard admin itu. Laravel mencocokkan
    // rute sesuai urutan didaftarkan, jadi rute literal wajib didaftarkan lebih dulu.
    Route::middleware('role:dudi')->group(function () {
        Route::get('/my-dudi-profile', [DudiController::class, 'myProfile']);
        Route::post('/dudi/tanda-tangan', [DudiController::class, 'uploadTandaTangan']);
        Route::put('/dudi/profile', [DudiController::class, 'updateProfile']);
        Route::get('/dudi/my-siswa', [PklPlacementController::class, 'siswaSaya']);
        Route::get('/dudi/absensi-pending', [PklAttendanceController::class, 'pendingVerifikasi']);
        Route::post('/pkl-placements/{pklPlacement}/penilaian', [PklPenilaianController::class, 'store']);
        Route::put('/pkl-placements/{pklPlacement}/penilaian', [PklPenilaianController::class, 'update']);
        Route::delete('/pkl-placements/{pklPlacement}/penilaian', [PklPenilaianController::class, 'destroy']);
    });

    // Waka Kesiswaan — Kelas, Siswa, Wali Siswa, jenis Poin Pelanggaran/
    // Prestasi, Kalender Libur, Jam Masuk, ditambah Catatan BK dan Aturan
    // Sanksi Bertingkat (eskalasi otomatis dari akumulasi poin siswa).
    Route::middleware('role:admin,waka_kesiswaan')->group(function () {
        // "destroy" DIKECUALIKAN di sini — hapus kelas cuma boleh admin
        // (data siswa & riwayatnya ikut berisiko), didaftarkan terpisah
        // di bawah dengan role:admin saja.
        Route::apiResource('classes', ClassRoomController::class)->parameters(['classes' => 'classRoom'])->except(['destroy']);
        Route::post('/classes/{classRoom}/luluskan', [ClassRoomController::class, 'luluskan']);
        Route::post('/classes/{classRoom}/aktifkan', [ClassRoomController::class, 'aktifkan']);
        Route::get('/students/import/template', [StudentController::class, 'downloadTemplate']);
        Route::post('/students/import', [StudentController::class, 'import']);
        Route::apiResource('students', StudentController::class);
        Route::put('/students/{student}/kembalikan-aktif', [StudentController::class, 'kembalikanAktif']);
        Route::put('/students/{student}/reset-password', [StudentController::class, 'resetPassword']);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        // "index" DIKECUALIKAN di sini dan didaftarkan terpisah di bawah
        // (grup role:admin,guru,waka_kesiswaan) — bukan basa-basi, tapi
        // supaya Guru (yang butuh baca daftar ini buat mencatat pelanggaran/
        // prestasi manual) tidak perlu 1 rute GET terpisah dengan URI SAMA;
        // 2 rute berbeda dengan URI+method identik akan membuat Laravel
        // cuma menyimpan yang terdaftar PALING TERAKHIR (yang lama ketiban,
        // bukan digabung), jadi role di rute pertama seolah kehilangan akses.
        Route::apiResource('violation-types', ViolationTypeController::class)->except(['show', 'index']);
        Route::apiResource('achievement-types', AchievementTypeController::class)->except(['show', 'index']);
        // "index" DIKECUALIKAN di sini juga — didaftarkan terpisah di bawah
        // supaya Waka Humas (menu Alumni, cuma baca) ikut bisa akses tanpa
        // bentrok URI ganda dengan rute ini.
        Route::post('/parents', [WaliController::class, 'store']);
        Route::put('/parents/{id}', [WaliController::class, 'update']);
        Route::post('/parents/{parentId}/link', [WaliController::class, 'link']);
        Route::delete('/parents/{parentId}/link/{studentId}', [WaliController::class, 'unlink']);
        Route::delete('/parents/{id}', [WaliController::class, 'destroy']);
        Route::put('/parents/{id}/reset-password', [WaliController::class, 'resetPassword']);
        Route::get('/parents/import/template', [WaliController::class, 'downloadTemplate']);
        Route::post('/parents/import', [WaliController::class, 'import']);

        Route::apiResource('sanksi-rules', SanksiRuleController::class)->except(['show']);
        Route::get('/sanksi-rules/siswa', [SanksiRuleController::class, 'siswa']);
    });

    // Catatan BK (bk-cases) sengaja PUNYA GRUP SENDIRI (bukan digabung ke
    // grup role:admin,waka_kesiswaan di atas) supaya akun BK ikut bisa
    // akses tanpa ikut kebagian semua wewenang lain di grup itu (kelas,
    // siswa, wali, dst) — dan supaya tidak bentrok URI+method sama seperti
    // catatan di atas (violation-types/achievement-types).
    Route::middleware('role:admin,waka_kesiswaan,bk')->group(function () {
        Route::apiResource('bk-cases', BkCaseController::class)->except(['show', 'index']);
        Route::get('/sanksi-kejadian/{sanksiKejadian}/export-word', [SanksiKejadianController::class, 'exportWord']);
        Route::post('/sanksi-kejadian/{sanksiKejadian}/selesaikan', [SanksiKejadianController::class, 'selesaikan']);
        Route::put('/sanksi-kejadian/{sanksiKejadian}', [SanksiKejadianController::class, 'update']);
        Route::delete('/sanksi-kejadian/{sanksiKejadian}', [SanksiKejadianController::class, 'destroy']);
        Route::get('/bk-students', [StudentController::class, 'index']);
    });

    // GET /bk-cases & GET /sanksi-kejadian dipisah dari grup di atas —
    // guru (wali kelas) ikut boleh baca (menu Laporan > BK), tapi TIDAK
    // boleh tulis/ubah/hapus catatan BK. Controller sendiri yang memaksa
    // guru cuma lihat kelas walinya (RestrictsGuruToOwnClass).
    Route::middleware('role:admin,waka_kesiswaan,bk,guru')->group(function () {
        Route::get('/bk-cases', [BkCaseController::class, 'index']);
        Route::get('/sanksi-kejadian', [SanksiKejadianController::class, 'index']);
    });

    // Kalender Libur dipindah ke menu Kurikulum (berdampingan dengan Kalender
    // Akademik), jadi ditulis Kesiswaan MAUPUN Kurikulum — datanya sama-sama
    // dipakai kedua bidang (Kesiswaan: proses alpa otomatis, Kurikulum:
    // tampilan kalender akademik).
    Route::middleware('role:admin,waka_kesiswaan,waka_kurikulum')->group(function () {
        Route::apiResource('holidays', HolidayController::class)->only(['store', 'destroy']);
        Route::post('/holidays/range', [HolidayController::class, 'storeRange']);
    });

    // Waka Kurikulum — Guru (kelola penuh, beda dari role lain yang cuma
    // lihat), dan Kalender Akademik (tanggal tahun ajaran + agenda
    // semester/ujian). Mata Pelajaran/Tugas Mengajar/Jadwal Pelajaran
    // dipindah ke grup "Pengembangan" (admin-only) di bawah.
    Route::middleware('role:admin,waka_kurikulum')->group(function () {
        Route::get('/teachers/import/template', [TeacherController::class, 'downloadTemplate']);
        Route::post('/teachers/import', [TeacherController::class, 'import']);
        Route::apiResource('teachers', TeacherController::class)->except(['index', 'show']);
        Route::put('/teachers/{teacher}/reset-password', [TeacherController::class, 'resetPassword']);

        // "index" DIKECUALIKAN di sini juga — didaftarkan terpisah di bawah
        // supaya Guru/Siswa/Wali (menu Pembelajaran/Beranda, cuma baca) ikut
        // bisa akses tanpa bentrok URI ganda dengan rute ini.
        Route::apiResource('academic-events', AcademicEventController::class)->except(['show', 'index']);

        Route::post('/tahun-ajaran', [TahunAjaranController::class, 'store']);
        Route::put('/tahun-ajaran/{id}', [TahunAjaranController::class, 'update']);
        Route::post('/tahun-ajaran/{id}/aktifkan', [TahunAjaranController::class, 'aktifkan']);
    });

    // Waka Humas (merangkap Hubin) — Kelola IDUKA penuh. Waka Kurikulum cuma
    // boleh baca (dipakai buat pilih IDUKA di form Penempatan PKL — index-nya
    // didaftarkan di grup shared read-only di bawah). Verifikasi pendaftar
    // PPDB dipindah ke grup "Pengembangan" (admin-only) di bawah.
    Route::middleware('role:admin,waka_humas')->group(function () {
        Route::get('/dudi/import/template', [DudiController::class, 'downloadTemplate']);
        Route::post('/dudi/import', [DudiController::class, 'import']);
        Route::apiResource('dudi', DudiController::class)->except(['show', 'index']);
        Route::put('/dudi/{dudi}/reset-password', [DudiController::class, 'resetPassword']);
    });

    // Penempatan PKL — cuma admin & Waka Kurikulum yang boleh tulis. Waka
    // Humas cuma boleh baca (index-nya didaftarkan di grup shared read-only
    // di bawah, gabung dengan /teachers, /students, dst).
    Route::middleware('role:admin,waka_kurikulum')->group(function () {
        Route::post('/pkl-placements/tutup-semua-aktif', [PklPlacementController::class, 'tutupSemuaAktif']);
        Route::post('/pkl-placements/aktifkan-semua-selesai', [PklPlacementController::class, 'aktifkanSemuaSelesai']);
        Route::post('/pkl-placements/bulk', [PklPlacementController::class, 'storeBulk']);
        Route::apiResource('pkl-placements', PklPlacementController::class)->except(['show', 'index']);
    });

    // Waka Sarpras — Ruang/Lab/Bengkel dan Inventaris Aset. Penanggung jawab
    // ruang terhubung ke data guru (lihat grup /teachers read-only di bawah).
    // Pemeliharaan & Pengadaan Barang dipindah ke grup "Pengembangan"
    // (admin-only) di bawah. Data ruang & hapus aset tetap khusus Waka
    // Sarpras (lihat grup Teknisi/Kepala Bengkel di bawah untuk akses baca
    // & kelola aset yang dibatasi per-ruang).
    Route::middleware('role:admin,waka_sarpras')->group(function () {
        Route::post('/rooms', [RoomController::class, 'store']);
        Route::put('/rooms/{room}', [RoomController::class, 'update']);
        Route::delete('/rooms/{room}', [RoomController::class, 'destroy']);
        Route::delete('/assets/{asset}', [AssetController::class, 'destroy']);

        // Akun Teknisi & Kepala Bengkel — masing-masing ditugaskan ke tepat
        // 1 ruang, dikelola Waka Sarpras.
        Route::get('/room-staff', [RoomStaffController::class, 'index']);
        Route::post('/room-staff', [RoomStaffController::class, 'store']);
        Route::put('/room-staff/{id}', [RoomStaffController::class, 'update']);
        Route::delete('/room-staff/{id}', [RoomStaffController::class, 'destroy']);
        Route::put('/room-staff/{id}/reset-password', [RoomStaffController::class, 'resetPassword']);
    });

    // Kepala Bengkel — baca/tulis Ruang & Aset dibuka untuk mereka, tapi
    // DIBATASI cuma ke ruang yang jadi tanggung jawabnya (lihat trait
    // RestrictsToOwnRoom). Teknisi CUMA baca (lihat grup di bawah) — tugas
    // mereka lapor & tangani Pemeliharaan, bukan kelola data inventaris.
    // Hapus data tetap khusus grup admin/waka_sarpras di atas.
    Route::middleware('role:admin,waka_sarpras,teknisi,kepala_bengkel')->group(function () {
        Route::get('/rooms', [RoomController::class, 'index']);
        Route::get('/assets/qr', [AssetController::class, 'findByBarcode']);
        Route::get('/assets', [AssetController::class, 'index']);
        Route::get('/assets/export-kir', [AssetController::class, 'exportKir']);
    });
    Route::middleware('role:admin,waka_sarpras,kepala_bengkel')->group(function () {
        Route::post('/assets', [AssetController::class, 'store']);
        Route::put('/assets/{asset}', [AssetController::class, 'update']);
        Route::get('/assets/import/template', [AssetController::class, 'downloadTemplate']);
        Route::post('/assets/import', [AssetController::class, 'import']);
    });

    // Mata Pelajaran, Tugas Mengajar, Template Jadwal, dan Jadwal Pelajaran
    // sekarang jadi bagian tetap menu Pembelajaran milik Waka Kurikulum
    // (dulu tahap uji coba di menu Pengembangan, sekarang sudah dianggap
    // siap dibagikan).
    Route::middleware('role:admin,waka_kurikulum')->group(function () {
        Route::apiResource('subjects', SubjectController::class)->except(['show', 'index']);
        Route::post('/teaching-assignments/generate-kode-guru', [TeachingAssignmentController::class, 'generateKodeGuru']);
        Route::put('/teaching-assignments/reorder', [TeachingAssignmentController::class, 'reorder']);
        Route::apiResource('teaching-assignments', TeachingAssignmentController::class)->except(['show']);
        Route::apiResource('period-templates', PeriodTemplateController::class)->except(['show']);
        Route::get('/schedules/grid', [ScheduleController::class, 'grid']);
        Route::get('/schedules/export-excel', [ScheduleExportController::class, 'exportExcel']);
        Route::apiResource('schedules', ScheduleController::class)->except(['show', 'index']);
        // Jadwal Monitoring PKL global — dibuat admin/waka_kurikulum. GET-nya
        // didaftarkan terpisah di grup role:admin,waka_kurikulum,guru di bawah
        // (guru cuma boleh lihat, bukan kelola).
        Route::apiResource('pkl-monitoring-jadwal', PklMonitoringJadwalController::class)->except(['show', 'index']);
    });

    Route::middleware('role:admin,waka_kurikulum,guru')->group(function () {
        Route::get('/pkl-monitoring-jadwal', [PklMonitoringJadwalController::class, 'index']);
    });

    // Menu "Pengembangan" — fitur yang masih tahap uji coba, sengaja cuma
    // dibuka untuk Super Admin dulu (belum dibagikan ke Waka terkait): PPDB,
    // Pengadaan Barang. Pemeliharaan sudah pindah jadi bagian tetap menu
    // Sarana & Prasarana (grup di bawah) — bukan lagi di sini.
    Route::middleware('role:admin')->group(function () {
        Route::get('/ppdb', [PpdbController::class, 'index']);
        Route::put('/ppdb/pengaturan', [PpdbController::class, 'updatePengaturan']);
        Route::put('/ppdb/{ppdbPendaftar}', [PpdbController::class, 'update']);
        Route::delete('/ppdb/{ppdbPendaftar}', [PpdbController::class, 'destroy']);

        Route::apiResource('procurements', ProcurementController::class)->except(['show']);
    });

    // Pemeliharaan — bagian tetap menu Sarana & Prasarana milik Waka Sarpras.
    // Teknisi & Kepala Bengkel DIBATASI cuma ke ruang/aset tanggung jawabnya
    // masing-masing (lihat RestrictsToOwnRoom); Teknisi tidak dibatasi ruang
    // (lihat trait). Hapus data khusus admin/Waka Sarpras.
    Route::middleware('role:admin,waka_sarpras,teknisi,kepala_bengkel')->group(function () {
        Route::apiResource('maintenance-requests', MaintenanceRequestController::class)->except(['show', 'destroy']);
    });
    Route::middleware('role:admin,waka_sarpras')->group(function () {
        Route::delete('/maintenance-requests/{maintenanceRequest}', [MaintenanceRequestController::class, 'destroy']);
    });

    // Guru, Akun TU, Profil Sekolah TETAP khusus Super Admin. Tahun Ajaran
    // (aktifkan/tanggal) sudah dibagi ke Waka Kurikulum di atas — tapi hapus
    // tahun ajaran tetap di sini karena efeknya permanen ke seluruh riwayat.
    // Backup & impor (timpa total) database — paling sensitif dari semua
    // fitur admin, sengaja TIDAK dibagi ke role Waka manapun.
    Route::middleware('role:admin')->group(function () {
        Route::put('/school-profile', [SchoolProfileController::class, 'update']);
        Route::post('/school-profile/logo', [SchoolProfileController::class, 'uploadLogo']);
        Route::post('/students/reset-poin', [StudentController::class, 'resetPoin']);
        Route::delete('/classes/{classRoom}', [ClassRoomController::class, 'destroy']);
        Route::delete('/tahun-ajaran/{id}', [TahunAjaranController::class, 'destroy']);
        Route::post('/tu', [TuController::class, 'store']);
        Route::put('/tu/{id}', [TuController::class, 'update']);
        Route::delete('/tu/{id}', [TuController::class, 'destroy']);
        Route::put('/tu/{id}/reset-password', [TuController::class, 'resetPassword']);
        Route::post('/bk', [BkAccountController::class, 'store']);
        Route::put('/bk/{id}', [BkAccountController::class, 'update']);
        Route::delete('/bk/{id}', [BkAccountController::class, 'destroy']);
        Route::put('/bk/{id}/reset-password', [BkAccountController::class, 'resetPassword']);
        Route::get('/admin-accounts', [AdminAccountController::class, 'index']);
        Route::post('/admin-accounts', [AdminAccountController::class, 'store']);
        Route::put('/admin-accounts/{id}', [AdminAccountController::class, 'update']);
        Route::delete('/admin-accounts/{id}', [AdminAccountController::class, 'destroy']);
        Route::put('/admin-accounts/{id}/reset-password', [AdminAccountController::class, 'resetPassword']);

        Route::get('/system/backup', [SystemBackupController::class, 'backup']);
        Route::post('/system/restore', [SystemBackupController::class, 'restore']);
    });

    // /teachers dibagi ke Waka Kesiswaan/Kurikulum/Humas/Sarpras. Kesiswaan/
    // Kurikulum/Humas pakai buat pilih guru pembimbing PKL di menu Penempatan;
    // Sarpras pakai buat hubungkan penanggung jawab ruang/lab ke data guru.
    Route::middleware('role:admin,waka_kesiswaan,waka_kurikulum,waka_humas,waka_sarpras')->group(function () {
        Route::get('/teachers', [TeacherController::class, 'index']);
        Route::get('/teachers/{teacher}', [TeacherController::class, 'show']);
    });

    // Daftar penempatan PKL — Waka Humas cuma boleh baca (tulisnya cuma
    // admin & Waka Kurikulum, lihat grup di atas).
    Route::middleware('role:admin,waka_humas,waka_kurikulum')->group(function () {
        Route::get('/pkl-placements', [PklPlacementController::class, 'index']);
    });

    // Dipakai Laporan PKL > Monitoring Guru (admin/Waka Kurikulum saja).
    // WAJIB didaftarkan sebelum GET /pkl-placements/{pklPlacement} di bawah
    // — kalau tidak, "guru-pembimbing" akan ketangkap sebagai id placement.
    Route::middleware('role:admin,waka_kurikulum')->group(function () {
        Route::get('/pkl-placements/guru-pembimbing', [PklPlacementController::class, 'guruPembimbing']);
    });

    // Daftar IDUKA — Waka Kurikulum cuma boleh baca (dipakai buat pilih
    // IDUKA di form Penempatan PKL — tulisnya cuma admin & Waka Humas,
    // lihat grup di atas).
    Route::middleware('role:admin,waka_humas,waka_kurikulum')->group(function () {
        Route::get('/dudi', [DudiController::class, 'index']);
    });

    // Daftar wali (parents) — Waka Humas cuma boleh baca, dipakai buat menu
    // Alumni > Wali Siswa Alumni (read-only, aksi hapus/reset/kembalikan
    // aktif tetap eksklusif milik Kesiswaan di atas).
    Route::middleware('role:admin,waka_kesiswaan,waka_humas')->group(function () {
        Route::get('/parents', [WaliController::class, 'index']);
    });

    // Read-only lintas-modul yang TIDAK relevan ke tugas Humas (PKL/IDUKA
    // saja) atau Sarpras (Sarana &amp; Prasarana saja) — sengaja tidak
    // diikutkan di sini, biar keduanya cuma bisa lihat apa yang memang jadi
    // tanggung jawabnya. Guru/Wali/Siswa ikut diberi akses baca — dipakai
    // menu Pembelajaran (Wali), Beranda (Guru), dan sub-menu QR > Kalender
    // (Siswa) buat menampilkan Kalender Akademik.
    Route::middleware('role:admin,waka_kesiswaan,waka_kurikulum,guru,wali,siswa')->group(function () {
        Route::get('/holidays', [HolidayController::class, 'index']);
        Route::get('/academic-events', [AcademicEventController::class, 'index']);
    });

    // Papan Pengumuman — semua guru boleh membuat/mengubah/menghapus
    // pengumumannya sendiri (dicek di controller), sedangkan pembacanya
    // dibuka luas (semua role sekolah) supaya siswa & wali/ortu ikut lihat.
    Route::middleware('role:admin,waka_kesiswaan,waka_kurikulum,waka_humas,waka_sarpras,guru,wali,siswa,bk,tu')->group(function () {
        Route::get('/announcements', [AnnouncementController::class, 'index']);
    });
    Route::middleware('role:guru')->group(function () {
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update']);
        Route::post('/announcements/{announcement}/foto', [AnnouncementController::class, 'uploadFoto']);
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy']);
    });

    // /tahun-ajaran dipisah dari grup di atas — dipakai dropdown pilih tahun
    // ajaran di sidebar (buat lihat data tahun lalu tanpa harus ubah tahun
    // ajaran aktif), jadi semua Waka (bukan cuma Kesiswaan/Kurikulum) perlu
    // baca daftarnya juga, sama seperti Guru/Wali. Siswa ikut diberi akses
    // baca juga — dipakai KalenderAkademikView (sub-menu QR > Kalender). BK
    // baca juga — dashboard kerjanya sekarang terikat tahun ajaran aktif,
    // jadi perlu tahu namanya buat ditampilkan. TU baca juga — tombol
    // pemilih tahun ajaran di menu Tagihan Lain.
    Route::middleware('role:admin,waka_kesiswaan,waka_kurikulum,waka_humas,waka_sarpras,guru,wali,siswa,bk,tu')->group(function () {
        Route::get('/tahun-ajaran', [TahunAjaranController::class, 'index']);
    });

    // /tu dan /dashboard/grafik TIDAK diikutkan buat Waka Kurikulum/Sarpras —
    // bukan bagian dari tanggung jawabnya.
    Route::middleware('role:admin,waka_kesiswaan')->group(function () {
        Route::get('/tu', [TuController::class, 'index']);
        Route::get('/bk', [BkAccountController::class, 'index']);
        Route::get('/dashboard/grafik', [DashboardChartController::class, 'grafik']);
    });

    // Daftar jenis Pelanggaran/Prestasi dibaca Guru (buat mencatat manual)
    // DAN Waka Kesiswaan (pemilik menunya) — didaftarkan sekali di sini
    // dengan role gabungan supaya tidak bentrok URI dengan rute index yang
    // dikecualikan dari apiResource waka_kesiswaan di atas.
    Route::middleware('role:admin,guru,waka_kesiswaan')->group(function () {
        Route::get('/violation-types', [ViolationTypeController::class, 'index']);
        Route::get('/achievement-types', [AchievementTypeController::class, 'index']);
    });

    Route::middleware('role:admin,guru')->group(function () {
        Route::get('/students/barcode/{code}', [StudentController::class, 'findByBarcode']);
        Route::post('/attendance/scan', [AttendanceController::class, 'scan']);
        Route::post('/attendance/manual', [AttendanceController::class, 'attendanceManual']);
        Route::post('/attendance/process-alpa', [AttendanceController::class, 'processAlpa']);
        Route::post('/attendance/record-manual', [AttendanceController::class, 'recordManual']);
        Route::post('/attendance/update-status', [AttendanceController::class, 'updateStatus']);
        Route::get('/attendance/my-class-report', [AttendanceController::class, 'myClassReport']);
        Route::get('/attendance/today-status', [AttendanceController::class, 'todayStatus']);
        Route::delete('/violations/{id}', [AttendanceController::class, 'violationDestroy']);
        Route::put('/violations/{id}', [AttendanceController::class, 'violationUpdate']);
        Route::post('/prayer/scan', [PrayerAttendanceController::class, 'scan']);
        Route::post('/prayer/manual', [PrayerAttendanceController::class, 'manual']);
        Route::get('/prayer/report', [PrayerAttendanceController::class, 'report']);
        Route::post('/achievements/record', [AchievementController::class, 'record']);
        Route::delete('/achievements/{id}', [AchievementController::class, 'destroy']);
        Route::put('/achievements/{id}', [AchievementController::class, 'update']);
        Route::get('/pkl-placements/my-bimbingan', [PklPlacementController::class, 'bimbinganSaya']);
    });

    // Laporan (Rekap Absensi/Poin Pelanggaran/Poin Prestasi) — Waka Humas &
    // Waka Kurikulum & Sarpras sengaja tidak diikutkan, bukan bagian dari
    // tanggung jawab mereka. Tidak lewat rute admin,guru di atas yang bisa
    // mengubah data. BK ikut diberi akses baca (menu Laporan BK) — semua
    // endpoint di grup ini GET saja, jadi aman dibaca lintas kelas tanpa
    // bisa mengubah data.
    Route::middleware('role:admin,guru,waka_kesiswaan,bk')->group(function () {
        Route::get('/attendance/report', [AttendanceController::class, 'report']);
        Route::get('/attendance/monthly-report', [AttendanceController::class, 'monthlyReport']);
        Route::get('/violations/summary', [AttendanceController::class, 'violationReport']);
        Route::get('/violations/detail', [AttendanceController::class, 'violationDetail']);
        Route::get('/students/{studentId}/violations', [AttendanceController::class, 'studentViolations']);
        Route::get('/achievements/summary', [AchievementController::class, 'summary']);
        Route::get('/achievements/detail', [AchievementController::class, 'detail']);
        Route::get('/students/{studentId}/achievements', [AchievementController::class, 'studentAchievements']);
    });

    Route::middleware('role:admin,guru,dudi,siswa')->group(function () {
        Route::get('/pkl-placements/{pklPlacement}', [PklPlacementController::class, 'show']);
        Route::get('/pkl-placements/{pklPlacement}/penilaian', [PklPenilaianController::class, 'show']);
        Route::get('/pkl-placements/{pklPlacement}/penilaian/export-word', [PklPenilaianController::class, 'exportWord']);
        Route::put('/pkl-jurnal/{pklJournal}', [PklJournalController::class, 'updateKegiatan']);
        Route::delete('/pkl-jurnal/{pklJournal}', [PklJournalController::class, 'destroyKegiatan']);
    });

    Route::middleware('role:admin,guru,dudi')->group(function () {
        Route::get('/pkl-placements/{pklPlacement}/attendances', [PklAttendanceController::class, 'riwayatPenempatan']);
        Route::post('/pkl-attendances/koreksi', [PklAttendanceController::class, 'koreksi']);
        Route::delete('/pkl-attendances/{pklAttendance}', [PklAttendanceController::class, 'hapus']);
        Route::get('/pkl-placements/{pklPlacement}/jurnal', [PklJournalController::class, 'riwayatPenempatan']);
        Route::get('/pkl-pembimbingan', [PklPembimbinganJournalController::class, 'index']);
    });

    // Laporan PKL (admin/Waka Kurikulum) — waka_kurikulum ditambahkan di grup
    // baru ini (bukan menimpa grup role:admin,guru,dudi di atas) supaya guru
    // & DUDI tetap bisa baca jurnal bimbingannya sendiri seperti biasa lewat
    // route yang sama. rekap absensi PKL cuma butuh baca, jadi rute baru.
    Route::middleware('role:admin,guru,dudi,waka_kurikulum')->group(function () {
        Route::get('/pkl-pembimbingan', [PklPembimbinganJournalController::class, 'index']);
    });

    Route::middleware('role:admin,waka_kurikulum')->group(function () {
        Route::get('/pkl-attendances/report', [PklAttendanceController::class, 'report']);
        Route::get('/pkl-jurnal/report', [PklJournalController::class, 'report']);
    });

    Route::middleware('role:admin,dudi')->group(function () {
        Route::post('/pkl-attendances/{pklAttendance}/verifikasi', [PklAttendanceController::class, 'verifikasi']);
        Route::put('/pkl-jurnal/{pklJournal}/catatan', [PklJournalController::class, 'isiCatatan']);
        Route::post('/pkl-pembimbingan/{pklPembimbinganJournal}/verifikasi', [PklPembimbinganJournalController::class, 'verifikasi']);
    });

    Route::middleware('role:guru')->group(function () {
        Route::post('/pkl-pembimbingan', [PklPembimbinganJournalController::class, 'store']);
        Route::put('/pkl-pembimbingan/{pklPembimbinganJournal}', [PklPembimbinganJournalController::class, 'update']);
        Route::delete('/pkl-pembimbingan/{pklPembimbinganJournal}', [PklPembimbinganJournalController::class, 'destroy']);
        Route::get('/my-teaching-schedule', [ScheduleController::class, 'myTeachingSchedule']);
        Route::get('/my-teaching-assignments', [TeachingAssignmentController::class, 'myAssignments']);
        Route::get('/academic-scores', [AcademicScoreController::class, 'index']);
        Route::get('/academic-scores/export-excel', [AcademicScoreController::class, 'exportExcel']);
        Route::post('/academic-scores/bulk', [AcademicScoreController::class, 'storeBulk']);
        // Rute "kegiatan" WAJIB didaftarkan sebelum {academicScore} di
        // bawah — kalau tidak, "kegiatan" akan tertangkap sebagai nilai
        // {academicScore} (route model binding, bukan literal path).
        Route::put('/academic-scores/kegiatan', [AcademicScoreController::class, 'updateKegiatan']);
        Route::delete('/academic-scores/kegiatan', [AcademicScoreController::class, 'destroyKegiatan']);
        Route::put('/academic-scores/{academicScore}', [AcademicScoreController::class, 'update']);
        Route::delete('/academic-scores/{academicScore}', [AcademicScoreController::class, 'destroy']);

        // Tahsin/Tahfidz/Tadarus — beda dari nilai akademik di atas, SEMUA
        // guru boleh mencatat untuk kelas/siswa manapun (tidak dikunci ke
        // Tugas Mengajar), lihat komentar di masing-masing controller.
        // GET index-nya didaftarkan terpisah di grup role:guru,admin,
        // waka_kesiswaan di bawah (dipakai juga oleh menu Laporan Admin),
        // supaya tulis/ubah/hapus tetap eksklusif guru.
        Route::post('/tahsin-scores/bulk', [TahsinScoreController::class, 'storeBulk']);
        Route::put('/tahsin-scores/{tahsinScore}', [TahsinScoreController::class, 'update']);
        Route::delete('/tahsin-scores/{tahsinScore}', [TahsinScoreController::class, 'destroy']);

        Route::post('/tahfidz-scores/bulk', [TahfidzScoreController::class, 'storeBulk']);
        Route::put('/tahfidz-scores/{tahfidzScore}', [TahfidzScoreController::class, 'update']);
        Route::delete('/tahfidz-scores/{tahfidzScore}', [TahfidzScoreController::class, 'destroy']);

        Route::post('/tadarus-scores/bulk', [TadarusScoreController::class, 'storeBulk']);
        Route::put('/tadarus-scores/{tadarusScore}', [TadarusScoreController::class, 'update']);
        Route::delete('/tadarus-scores/{tadarusScore}', [TadarusScoreController::class, 'destroy']);
    });

    // Laporan Nilai Akademik (Waka Kurikulum) & Tahsin/Tahfidz/Tadarus
    // (Waka Kesiswaan) di menu Laporan Admin — baca-saja, guru tetap bisa
    // akses index Tahsin/Tahfidz/Tadarus yang sama untuk menu Penilaiannya.
    Route::middleware('role:guru,admin,waka_kesiswaan')->group(function () {
        Route::get('/tahsin-scores', [TahsinScoreController::class, 'index']);
        Route::get('/tahfidz-scores', [TahfidzScoreController::class, 'index']);
        Route::get('/tadarus-scores', [TadarusScoreController::class, 'index']);
    });

    Route::middleware('role:admin,waka_kurikulum')->group(function () {
        Route::get('/academic-scores/laporan', [AcademicScoreController::class, 'laporan']);
    });

    Route::middleware('role:siswa')->group(function () {
        Route::get('/my-profile', [StudentSelfController::class, 'profile']);
        Route::get('/my-attendances', [StudentSelfController::class, 'attendances']);
        Route::get('/my-violations', [StudentSelfController::class, 'violations']);
        Route::get('/my-achievements', [StudentSelfController::class, 'achievements']);
        Route::get('/my-pkl-placement', [PklPlacementController::class, 'punyaKuSekarang']);
        Route::get('/my-pkl-attendances', [PklAttendanceController::class, 'riwayatSaya']);
        Route::post('/pkl/absen-masuk', [PklAttendanceController::class, 'absenMasuk']);
        Route::post('/pkl/absen-pulang', [PklAttendanceController::class, 'absenPulang']);
        Route::post('/pkl/izin-sakit', [PklAttendanceController::class, 'ajukanIzinSakit']);
        Route::put('/pkl-attendances/{pklAttendance}', [PklAttendanceController::class, 'updateIzinSakit']);
        Route::delete('/pkl-attendances/{pklAttendance}/izin-sakit', [PklAttendanceController::class, 'hapusIzinSakit']);
        Route::get('/my-pkl-jurnal', [PklJournalController::class, 'riwayatSaya']);
        Route::post('/pkl-jurnal', [PklJournalController::class, 'simpanKegiatan']);
        Route::get('/my-schedule', [ScheduleController::class, 'mySchedule']);
        Route::get('/my-academic-scores', [AcademicScoreController::class, 'myScores']);
        Route::get('/my-tahsin-scores', [TahsinScoreController::class, 'myScores']);
        Route::get('/my-tahfidz-scores', [TahfidzScoreController::class, 'myScores']);
        Route::get('/my-tadarus-scores', [TadarusScoreController::class, 'myScores']);
    });

    Route::middleware('role:wali')->group(function () {
        Route::get('/my-children', [ParentController::class, 'children']);
        Route::get('/my-children/{studentId}/activity', [ParentController::class, 'activity']);
        Route::get('/my-children/{studentId}/spp', [ParentController::class, 'spp']);
        Route::get('/my-children/{studentId}/tagihan-lain', [ParentController::class, 'tagihanLain']);
        Route::get('/my-children/{studentId}/schedule', [ScheduleController::class, 'childSchedule']);
        Route::get('/my-children/{studentId}/academic-scores', [ParentController::class, 'academicScores']);
        Route::get('/my-children/{studentId}/tahsin-scores', [ParentController::class, 'tahsinScores']);
        Route::get('/my-children/{studentId}/tahfidz-scores', [ParentController::class, 'tahfidzScores']);
        Route::get('/my-children/{studentId}/tadarus-scores', [ParentController::class, 'tadarusScores']);
    });

    Route::middleware('role:tu')->group(function () {
        Route::get('/spp/settings', [SppController::class, 'settings']);
        Route::put('/spp/settings', [SppController::class, 'updateSettings']);
        Route::get('/spp/siswa/{studentId}', [SppController::class, 'byStudent']);
        Route::get('/spp/alumni', [SppController::class, 'alumni']);
        Route::get('/spp', [SppController::class, 'index']);
        Route::get('/spp/{spp}', [SppController::class, 'show']);
        Route::post('/spp/generate', [SppController::class, 'generate']);
        Route::post('/spp/bayar-dimuka', [SppController::class, 'bayarDimuka']);
        Route::put('/spp/{spp}', [SppController::class, 'update']);
        Route::put('/spp/{spp}/status', [SppController::class, 'updateStatus']);
        Route::put('/spp/{spp}/bayar-sebagian', [SppController::class, 'bayarSebagian']);
        Route::delete('/spp/bulan', [SppController::class, 'destroyBulan']);
        Route::delete('/spp/{spp}', [SppController::class, 'destroy']);

        // Tagihan di luar SPP bulanan (biaya tidak tetap/insidental). Rute
        // literal (siswa/{id}, bulk, nama) WAJIB didaftarkan sebelum rute
        // wildcard ({tagihanLain}) yang segmen-nya sama panjang — sama
        // seperti pola /spp/bulan vs /spp/{spp} di atas — supaya tidak
        // ketiban rute wildcard itu.
        Route::get('/tagihan-lain', [TagihanLainController::class, 'index']);
        Route::get('/tagihan-lain/siswa/{studentId}', [TagihanLainController::class, 'byStudent']);
        Route::post('/tagihan-lain/bulk', [TagihanLainController::class, 'storeBulk']);
        Route::post('/tagihan-lain', [TagihanLainController::class, 'store']);
        Route::put('/tagihan-lain/{tagihanLain}/status', [TagihanLainController::class, 'updateStatus']);
        Route::put('/tagihan-lain/{tagihanLain}/bayar-sebagian', [TagihanLainController::class, 'bayarSebagian']);
        Route::put('/tagihan-lain/{tagihanLain}', [TagihanLainController::class, 'update']);
        Route::delete('/tagihan-lain/nama', [TagihanLainController::class, 'destroyByNama']);
        Route::delete('/tagihan-lain/{tagihanLain}', [TagihanLainController::class, 'destroy']);
        Route::get('/tagihan-lain/{tagihanLain}', [TagihanLainController::class, 'show']);

        // Menu Laporan — rekap keuangan bulanan (gabungan SPP + Tagihan Lain
        // berdasarkan tanggal_bayar) dan daftar tunggakan per siswa.
        Route::get('/laporan/keuangan', [LaporanController::class, 'keuangan']);
        Route::get('/laporan/keuangan/export', [LaporanController::class, 'keuanganExport']);
        Route::get('/laporan/tunggakan', [LaporanController::class, 'tunggakan']);
        Route::get('/laporan/tunggakan/export', [LaporanController::class, 'tunggakanExport']);
    });

    // Dipisah dari grup role:admin,guru di atas supaya TU & Waka lain juga
    // bisa akses (butuh daftar kelas & siswa buat filter menu masing-masing),
    // tanpa memberi TU akses ke rute lain di grup itu (absensi, pelanggaran,
    // dll). Waka Sarpras TIDAK diikutkan — Sarana &amp; Prasarana tidak butuh
    // data kelas/siswa sama sekali.
    Route::middleware('role:admin,guru,tu,waka_kesiswaan,waka_kurikulum,waka_humas')->group(function () {
        Route::get('/classes', [ClassRoomController::class, 'index']);
        Route::get('/students', [StudentController::class, 'index']);
        Route::get('/subjects', [SubjectController::class, 'index']);
    });

    // GET /classes ditimpa di sini supaya BK ikut bisa akses (filter Kelas
    // di Laporan BK) tanpa ikut kebagian /students & /subjects di grup di
    // atas yang tidak relevan buat BK.
    Route::middleware('role:admin,guru,tu,waka_kesiswaan,waka_kurikulum,waka_humas,bk')->group(function () {
        Route::get('/classes', [ClassRoomController::class, 'index']);
    });
});
