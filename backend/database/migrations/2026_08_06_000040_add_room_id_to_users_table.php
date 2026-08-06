<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Ruang yang jadi tanggung jawab akun Teknisi/Kepala Bengkel — kosong
    // (belum ditugaskan) untuk role lain, sama seperti kolom "phone" yang
    // cuma dipakai role wali.
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('room_id')->nullable()->after('role')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('room_id');
        });
    }
};
