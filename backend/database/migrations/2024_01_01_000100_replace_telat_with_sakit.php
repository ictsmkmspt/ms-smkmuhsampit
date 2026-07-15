<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('attendances')->where('status', 'telat')->update(['status' => 'hadir']);

        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('status', ['hadir', 'izin', 'sakit'])->default('hadir')->change();
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('status', ['hadir', 'telat', 'izin'])->default('hadir')->change();
        });
    }
};
