<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('value');
            $table->string('label')->nullable();
            $table->timestamps();
        });

        DB::table('settings')->insert([
            ['key' => 'jam_masuk_mulai', 'value' => '06:00', 'label' => 'Jam Mulai Absen',   'created_at' => now(), 'updated_at' => now()],
            ['key' => 'jam_masuk_batas', 'value' => '07:30', 'label' => 'Batas Tepat Waktu', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'jam_masuk_tutup', 'value' => '09:00', 'label' => 'Jam Tutup Absen',   'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
