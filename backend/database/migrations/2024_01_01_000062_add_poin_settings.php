<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->insertOrIgnore([
            ['key' => 'poin_telat', 'value' => '5',  'label' => 'Poin Pelanggaran Terlambat', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'poin_alpa',  'value' => '10', 'label' => 'Poin Pelanggaran Tidak Hadir', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', ['poin_telat', 'poin_alpa'])->delete();
    }
};
