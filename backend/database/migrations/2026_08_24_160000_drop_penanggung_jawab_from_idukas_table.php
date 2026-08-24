<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('idukas', 'penanggung_jawab')) {
            Schema::table('idukas', function (Blueprint $table) {
                $table->dropColumn('penanggung_jawab');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('idukas', 'penanggung_jawab')) {
            Schema::table('idukas', function (Blueprint $table) {
                $table->string('penanggung_jawab')->nullable()->after('alamat');
            });
        }
    }
};
