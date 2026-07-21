<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\ParentController;
use App\Http\Controllers\Api\PrayerAttendanceController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentSelfController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\ViolationTypeController;
use App\Http\Controllers\Api\WaliController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin')->group(function () {
        Route::apiResource('classes', ClassRoomController::class)->parameters(['classes' => 'classRoom']);
	Route::get('/students/import/template', [StudentController::class, 'downloadTemplate']);
        Route::post('/students/import', [StudentController::class, 'import']);
	Route::apiResource('students', StudentController::class);
        Route::get('/teachers/import/template', [TeacherController::class, 'downloadTemplate']);
        Route::post('/teachers/import', [TeacherController::class, 'import']);
        Route::apiResource('teachers', TeacherController::class);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        Route::apiResource('violation-types', ViolationTypeController::class)->except(['show']);
        Route::apiResource('holidays', HolidayController::class)->only(['index', 'store', 'destroy']);
	Route::get('/parents', [WaliController::class, 'index']);
        Route::post('/parents', [WaliController::class, 'store']);
        Route::post('/parents/{parentId}/link', [WaliController::class, 'link']);
        Route::delete('/parents/{parentId}/link/{studentId}', [WaliController::class, 'unlink']);
        Route::delete('/parents/{id}', [WaliController::class, 'destroy']);
    });

    Route::middleware('role:admin,guru')->group(function () {
	Route::get('/classes', [ClassRoomController::class, 'index']);
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
        Route::get('/violation-types', [ViolationTypeController::class, 'index']);
        Route::get('/students', [StudentController::class, 'index']);
	Route::post('/prayer/scan', [PrayerAttendanceController::class, 'scan']);
        Route::post('/prayer/manual', [PrayerAttendanceController::class, 'manual']);
        Route::get('/prayer/report', [PrayerAttendanceController::class, 'report']);
    });

    Route::middleware('role:siswa')->group(function () {
        Route::get('/my-profile', [StudentSelfController::class, 'profile']);
        Route::get('/my-attendances', [StudentSelfController::class, 'attendances']);
    });

    Route::middleware('role:wali')->group(function () {
        Route::get('/my-children', [ParentController::class, 'children']);
        Route::get('/my-children/{studentId}/activity', [ParentController::class, 'activity']);
    });
});
