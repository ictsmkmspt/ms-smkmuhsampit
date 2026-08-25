<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('idukas', function (Blueprint $table) {
            $table->enum('jenis_kerjasama', ['pkl', 'rekrutmen', 'keduanya'])->default('keduanya')->after('nama_perusahaan');
            $table->string('dokumen_mou')->nullable()->after('tanda_tangan');
        });
    }

    public function down(): void
    {
        Schema::table('idukas', function (Blueprint $table) {
            $table->dropColumn(['jenis_kerjasama', 'dokumen_mou']);
        });
    }
};
