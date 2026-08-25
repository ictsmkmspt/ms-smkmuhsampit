<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->foreignId('ppdb_periode_id')->nullable()->after('student_id')->constrained('ppdb_periodes')->nullOnDelete();
        });

        // Backfill semua pendaftar lama (dibuat sebelum kolom ini ada) ke
        // periode yang baru saja diaktifkan di migrasi sebelumnya, supaya
        // langsung ikut kehitung di rekap Keuangan PPDB tanpa perlu
        // sentuhan manual admin.
        $periodeAktifId = DB::table('ppdb_periodes')->where('status', 'aktif')->value('id');
        if ($periodeAktifId) {
            DB::table('ppdb_pendaftars')->whereNull('ppdb_periode_id')->update(['ppdb_periode_id' => $periodeAktifId]);
        }
    }

    public function down(): void
    {
        Schema::table('ppdb_pendaftars', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ppdb_periode_id');
        });
    }
};
