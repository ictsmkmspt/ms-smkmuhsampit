<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jenis kelamin disimpan sebagai kode singkat "L" (Laki-laki) atau "P"
     * (Perempuan) di database & file import/export — supaya ringkas dan
     * konsisten dengan format yang umum dipakai di data sekolah. Frontend
     * yang bertugas menerjemahkan kode ini jadi teks lengkap saat ditampilkan.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->char('jenis_kelamin', 1)->nullable()->after('nis');
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->char('jenis_kelamin', 1)->nullable()->after('nip');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('jenis_kelamin');
        });

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('jenis_kelamin');
        });
    }
};
