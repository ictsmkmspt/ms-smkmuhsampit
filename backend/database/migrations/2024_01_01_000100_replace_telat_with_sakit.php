<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('attendances')->where('status', 'telat')->update(['status' => 'hadir']);

        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('status', ['hadir', 'izin', 'sakit'])->default('hadir')->change();
        });
    }

    public function down(): void
    {
        // Enum tujuan rollback ini tidak punya 'sakit' — kalau ada baris
        // berstatus 'sakit' (pasti ada di database mana pun yang sempat
        // dipakai sejak migration ini, karena 'sakit' baru mulai valid di
        // sini), ALTER enum di bawah akan ditolak DB (strict mode) atau
        // datanya rusak diam-diam (non-strict). Konversi dulu ke 'izin'
        // supaya rollback tetap aman dijalankan kapan pun.
        DB::table('attendances')->where('status', 'sakit')->update(['status' => 'izin']);

        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('status', ['hadir', 'telat', 'izin'])->default('hadir')->change();
        });
    }
};
