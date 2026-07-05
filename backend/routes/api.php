<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassRoomController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentSelfController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\ViolationTypeController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin')->group(function () {
        Route::apiResource('classes', ClassRoomController::class);
        Route::apiResource('students', StudentController::class);
        Route::apiResource('teachers', TeacherController::class);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
	Route::post('/attendance/update-status', [AttendanceController::class, 'updateStatus']);
        Route::apiResource('violation-types', ViolationTypeController::class)->except(['show']);
    });

    Route::middleware('role:admin,guru')->group(function () {
	Route::get('/classes', [ClassRoomController::class, 'index']);
        Route::get('/students/barcode/{code}', [StudentController::class, 'findByBarcode']);
        Route::post('/attendance/scan', [AttendanceController::class, 'scan']);
        Route::post('/attendance/manual', [AttendanceController::class, 'attendanceManual']);
        Route::post('/attendance/manual', [AttendanceController::class, 'attendanceManual']);
        Route::post('/attendance/process-alpa', [AttendanceController::class, 'processAlpa']);
        Route::post('/attendance/record-manual', [AttendanceController::class, 'recordManual']);
        Route::get('/attendance/report', [AttendanceController::class, 'report']);
        Route::get('/violations/summary', [AttendanceController::class, 'violationReport']);
        Route::get('/violations/detail', [AttendanceController::class, 'violationDetail']);
        Route::get('/students/{studentId}/violations', [AttendanceController::class, 'studentViolations']);
        Route::get('/violation-types', [ViolationTypeController::class, 'index']);
        Route::get('/students', [StudentController::class, 'index']);
    });

    Route::middleware('role:siswa')->group(function () {
        Route::get('/my-profile', [StudentSelfController::class, 'profile']);
        Route::get('/my-attendances', [StudentSelfController::class, 'attendances']);
    });
});
