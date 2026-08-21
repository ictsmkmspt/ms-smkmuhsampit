<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cbt_materi', function (Blueprint $table) {
            $table->foreignId('tp_id')->nullable()->after('subject_id')
                ->constrained('cbt_tujuan_pembelajaran')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('cbt_materi', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tp_id');
        });
    }
};
