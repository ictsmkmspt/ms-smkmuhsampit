<?php

use App\Http\Controllers\Api\AchievementController;
use App\Http\Controllers\Api\AchievementTypeController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\DudiController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PklAttendanceController;
use App\Http\Controllers\Api\PklJournalController;
use App\Http\Controllers\Api\PklPenilaianController;
use App\Http\Controllers\Api\PklPembimbinganJournalController;
use App\Http\Controllers\Api\PklPlacementController;
use App\Http\Controllers\Api\PrayerAttendanceController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SppController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentSelfController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\TuController;
use App\Http\Controllers\Api\ViolationTypeController;
use App\Http\Controllers\Api\WaliController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/password', [AuthController::class, 'changePassword']);
    Route::get('/leaderboard/prestasi', [AchievementController::class, 'leaderboard']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin')->group(function () {
        Route::apiResource('classes', ClassRoomController::class)->parameters(['classes' => 'classRoom']);
        Route::post('/classes/{classRoom}/luluskan', [ClassRoomController::class, 'luluskan']);
        Route::post('/classes/{classRoom}/aktifkan', [ClassRoomController::class, 'aktifkan']);
        Route::get('/students/import/template', [StudentController::class, 'downloadTemplate']);
        Route::post('/students/import', [StudentController::class, 'import']);
        Route::apiResource('students', StudentController::class);
        Route::put('/students/{student}/kembalikan-aktif', [StudentController::class, 'kembalikanAktif']);
        Route::get('/teachers/import/template', [TeacherController::class, 'downloadTemplate']);
        Route::post('/teachers/import', [TeacherController::class, 'import']);
        Route::apiResource('teachers', TeacherController::class);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        Route::apiResource('violation-types', ViolationTypeController::class)->except(['show']);
        Route::post('/violations/reset-all', [AttendanceController::class, 'violationResetAll']);
        Route::apiResource('holidays', HolidayController::class)->only(['index', 'store', 'destroy']);
        Route::post('/holidays/range', [HolidayController::class, 'storeRange']);
        Route::apiResource('achievement-types', AchievementTypeController::class)->except(['show']);
        Route::post('/achievements/reset-all', [AchievementController::class, 'resetAll']);
        Route::get('/parents', [WaliController::class, 'index']);
        Route::post('/parents', [WaliController::class, 'store']);
        Route::post('/parents/{parentId}/link', [WaliController::class, 'link']);
        Route::delete('/parents/{parentId}/link/{studentId}', [WaliController::class, 'unlink']);
        Route::delete('/parents/{id}', [WaliController::class, 'destroy']);
        Route::get('/parents/import/template', [WaliController::class, 'downloadTemplate']);
        Route::post('/parents/import', [WaliController::class, 'import']);
        Route::apiResource('dudi', DudiController::class)->except(['show']);
        Route::get('/tu', [TuController::class, 'index']);
        Route::post('/tu', [TuController::class, 'store']);
        Route::delete('/tu/{id}', [TuController::class, 'destroy']);
        Route::post('/pkl-placements/tutup-semua-aktif', [PklPlacementController::class, 'tutupSemuaAktif']);
        Route::post('/pkl-placements/aktifkan-semua-selesai', [PklPlacementController::class, 'aktifkanSemuaSelesai']);
        Route::post('/pkl-placements/reset-semua', [PklPlacementController::class, 'resetSemuaPkl']);
        Route::apiResource('pkl-placements', PklPlacementController::class)->except(['show']);
    });

    Route::middleware('role:admin,guru')->group(function () {
        Route::get('/students/barcode/{code}', [StudentController::class, 'findByBarcode']);
        Route::post('/attendance/scan', [AttendanceController::class, 'scan']);
        Route::post('/attendance/manual', [AttendanceController::class, 'attendanceManual']);
        Route::post('/attendance/process-alpa', [AttendanceController::class, 'processAlpa']);
        Route::post('/attendance/record-manual', [AttendanceController::class, 'recordManual']);
        Route::post('/attendance/update-status', [AttendanceController::class, 'updateStatus']);
        Route::get('/attendance/report', [AttendanceController::class, 'report']);
        Route::get('/attendance/my-class-report', [AttendanceController::class, 'myClassReport']);
        Route::get('/attendance/monthly-report', [AttendanceController::class, 'monthlyReport']);
        Route::get('/violations/summary', [AttendanceController::class, 'violationReport']);
        Route::get('/violations/detail', [AttendanceController::class, 'violationDetail']);
        Route::get('/students/{studentId}/violations', [AttendanceController::class, 'studentViolations']);
        Route::delete('/violations/{id}', [AttendanceController::class, 'violationDestroy']);
        Route::put('/violations/{id}', [AttendanceController::class, 'violationUpdate']);
        Route::get('/violation-types', [ViolationTypeController::class, 'index']);
        Route::post('/prayer/scan', [PrayerAttendanceController::class, 'scan']);
        Route::post('/prayer/manual', [PrayerAttendanceController::class, 'manual']);
        Route::get('/prayer/report', [PrayerAttendanceController::class, 'report']);
        Route::get('/achievement-types', [AchievementController::class, 'types']);
        Route::post('/achievements/record', [AchievementController::class, 'record']);
        Route::get('/achievements/summary', [AchievementController::class, 'summary']);
        Route::get('/achievements/detail', [AchievementController::class, 'detail']);
        Route::get('/students/{studentId}/achievements', [AchievementController::class, 'studentAchievements']);
        Route::delete('/achievements/{id}', [AchievementController::class, 'destroy']);
        Route::put('/achievements/{id}', [AchievementController::class, 'update']);
        Route::get('/pkl-placements/my-bimbingan', [PklPlacementController::class, 'bimbinganSaya']);
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

    Route::middleware('role:admin,dudi')->group(function () {
        Route::post('/pkl-attendances/{pklAttendance}/verifikasi', [PklAttendanceController::class, 'verifikasi']);
        Route::put('/pkl-jurnal/{pklJournal}/catatan', [PklJournalController::class, 'isiCatatan']);
        Route::post('/pkl-pembimbingan/{pklPembimbinganJournal}/verifikasi', [PklPembimbinganJournalController::class, 'verifikasi']);
    });

    Route::middleware('role:guru')->group(function () {
        Route::post('/pkl-pembimbingan', [PklPembimbinganJournalController::class, 'store']);
        Route::put('/pkl-pembimbingan/{pklPembimbinganJournal}', [PklPembimbinganJournalController::class, 'update']);
        Route::delete('/pkl-pembimbingan/{pklPembimbinganJournal}', [PklPembimbinganJournalController::class, 'destroy']);
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
    });

    Route::middleware('role:wali')->group(function () {
        Route::get('/my-children', [ParentController::class, 'children']);
        Route::get('/my-children/{studentId}/activity', [ParentController::class, 'activity']);
        Route::get('/my-children/{studentId}/spp', [ParentController::class, 'spp']);
    });

    Route::middleware('role:tu')->group(function () {
        Route::get('/spp/settings', [SppController::class, 'settings']);
        Route::put('/spp/settings', [SppController::class, 'updateSettings']);
        Route::get('/spp/siswa/{studentId}', [SppController::class, 'byStudent']);
        Route::get('/spp/alumni', [SppController::class, 'alumni']);
        Route::get('/spp', [SppController::class, 'index']);
        Route::get('/spp/{spp}', [SppController::class, 'show']);
        Route::post('/spp/generate', [SppController::class, 'generate']);
        Route::put('/spp/{spp}', [SppController::class, 'update']);
        Route::put('/spp/{spp}/status', [SppController::class, 'updateStatus']);
        Route::delete('/spp/bulan', [SppController::class, 'destroyBulan']);
        Route::delete('/spp/{spp}', [SppController::class, 'destroy']);
    });

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

    // Dipisah dari grup role:admin,guru di atas supaya TU juga bisa akses
    // (butuh daftar kelas & siswa buat filter menu SPP), tanpa memberi TU
    // akses ke rute lain di grup itu (absensi, pelanggaran, dll).
    Route::middleware('role:admin,guru,tu')->group(function () {
        Route::get('/classes', [ClassRoomController::class, 'index']);
        Route::get('/students', [StudentController::class, 'index']);
    });
});
