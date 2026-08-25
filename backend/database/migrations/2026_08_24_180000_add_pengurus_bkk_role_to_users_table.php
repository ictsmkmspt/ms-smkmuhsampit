<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','guru','siswa','wali','iduka','instruktur','tu','waka','waka_kesiswaan','waka_kurikulum','waka_humas','waka_sarpras','teknisi','kepala_bengkel','bk','pustakawan','kepala_sekolah','pengawas_ujian','pengurus_bkk') NOT NULL DEFAULT 'siswa'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','guru','siswa','wali','iduka','instruktur','tu','waka','waka_kesiswaan','waka_kurikulum','waka_humas','waka_sarpras','teknisi','kepala_bengkel','bk','pustakawan','kepala_sekolah','pengawas_ujian') NOT NULL DEFAULT 'siswa'");
        }
    }
};
