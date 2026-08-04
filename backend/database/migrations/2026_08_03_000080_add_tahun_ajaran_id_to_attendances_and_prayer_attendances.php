<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['attendances', 'prayer_attendances'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('tahun_ajaran_id')->nullable()->after('id')->constrained()->onDelete('set null');
            });
        }

        // Data yang sudah ada sebelum fitur ini dibuat ditandai ikut tahun
        // ajaran yang aktif sekarang, sama seperti perlakuan pelanggaran/
        // prestasi/PKL sebelumnya.
        $aktifId = DB::table('tahun_ajarans')->where('status', 'aktif')->value('id');
        if ($aktifId) {
            DB::table('attendances')->whereNull('tahun_ajaran_id')->update(['tahun_ajaran_id' => $aktifId]);
            DB::table('prayer_attendances')->whereNull('tahun_ajaran_id')->update(['tahun_ajaran_id' => $aktifId]);
        }
    }

    public function down(): void
    {
        foreach (['attendances', 'prayer_attendances'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('tahun_ajaran_id');
            });
        }
    }
};
