<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('penanggung_jawab');
            $table->foreignId('teacher_id')->nullable()->after('kapasitas')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('teacher_id');
            $table->string('penanggung_jawab')->nullable()->after('kapasitas');
        });
    }
};
