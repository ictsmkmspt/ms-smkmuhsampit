<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Opsional — kalau catatan BK ini dibuat sebagai tindak lanjut dari
     * kejadian sanksi tertentu (bukan catatan umum lain), tersambung ke
     * baris sanksi_kejadian-nya.
     */
    public function up(): void
    {
        Schema::table('bk_cases', function (Blueprint $table) {
            $table->foreignId('sanksi_kejadian_id')->nullable()->after('student_id')->constrained('sanksi_kejadian')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bk_cases', function (Blueprint $table) {
            $table->dropForeign(['sanksi_kejadian_id']);
            $table->dropColumn('sanksi_kejadian_id');
        });
    }
};
