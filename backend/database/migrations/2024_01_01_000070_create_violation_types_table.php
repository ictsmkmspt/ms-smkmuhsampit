<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('violation_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('poin');
            $table->string('system_key')->nullable()->unique();
            $table->timestamps();
        });

        $poinTelat = DB::table('settings')->where('key', 'poin_telat')->value('value') ?? 5;
        $poinAlpa  = DB::table('settings')->where('key', 'poin_alpa')->value('value') ?? 10;

        DB::table('violation_types')->insert([
            ['name' => 'Terlambat',   'poin' => (int) $poinTelat, 'system_key' => 'telat', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Tidak Hadir', 'poin' => (int) $poinAlpa,  'system_key' => 'alpa',  'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('violation_types');
    }
};
