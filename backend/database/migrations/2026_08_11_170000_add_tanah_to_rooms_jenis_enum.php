<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE rooms MODIFY jenis ENUM('kelas', 'lab', 'bengkel', 'kantor', 'lainnya', 'tanah') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE rooms MODIFY jenis ENUM('kelas', 'lab', 'bengkel', 'kantor', 'lainnya') NOT NULL");
    }
};
