<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Batas jam mengajar mingguan per guru — dipakai jadwal pelajaran OTOMATIS
 * (ScheduleController::generateOtomatis()) supaya tidak menumpuk jam
 * mengajar 1 guru melebihi batas yang sudah ditentukan sekolah (mis. 24
 * jam/minggu). Nullable = tidak dibatasi (guru itu boleh sebanyak apapun,
 * cocok buat guru yang memang honornya dihitung per jam tanpa batas atas).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_jam_mengajar')->nullable()->after('jenis_kelamin');
        });
    }

    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('max_jam_mengajar');
        });
    }
};
