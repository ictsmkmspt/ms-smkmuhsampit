<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->string('berkas_formulir_pendaftaran')->nullable()->after('berkas_pas_foto');
        });
    }

    public function down(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->dropColumn('berkas_formulir_pendaftaran');
        });
    }
};
