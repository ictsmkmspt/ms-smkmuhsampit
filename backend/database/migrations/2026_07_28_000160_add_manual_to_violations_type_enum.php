<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom "type" di tabel violations awalnya cuma untuk 2 kasus lama
     * ('telat', 'alpa'), tapi kode sekarang juga mencatat pelanggaran manual
     * (dari dropdown jenis pelanggaran custom lewat violation_type_id) dengan
     * nilai 'manual' — jadi perlu ditambahkan ke pilihan enum-nya, supaya
     * tidak kena error "Data truncated for column 'type'".
     */
    public function up(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->enum('type', ['telat', 'alpa', 'manual'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->enum('type', ['telat', 'alpa'])->change();
        });
    }
};
