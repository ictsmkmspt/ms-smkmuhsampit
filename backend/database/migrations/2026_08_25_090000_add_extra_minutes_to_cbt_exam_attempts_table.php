<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->unsignedInteger('extra_minutes')->default(0)->after('tab_switch_count');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_exam_attempts', function (Blueprint $table) {
            $table->dropColumn('extra_minutes');
        });
    }
};
