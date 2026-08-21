<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->json('soal_acak')->nullable()->after('tab_switch_count');
            $table->string('device_token', 40)->nullable()->after('soal_acak');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->dropColumn(['soal_acak', 'device_token']);
        });
    }
};
