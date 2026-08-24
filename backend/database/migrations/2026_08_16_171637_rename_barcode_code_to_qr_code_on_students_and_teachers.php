<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Istilah "barcode" diganti "QR Code" di seluruh aplikasi (kode yang
     * dihasilkan & dipindai memang selalu QR Code, bukan barcode 1D) —
     * kolomnya ikut disamakan namanya, termasuk nama unique index-nya
     * (RENAME INDEX, bukan drop+create ulang, supaya tidak ada jeda tanpa
     * constraint unik). Di luar MySQL (mis. SQLite untuk lokal), rename
     * lewat Schema::renameColumn karena sintaks CHANGE/RENAME INDEX di atas
     * spesifik MySQL.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE students CHANGE barcode_code qr_code VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE students RENAME INDEX students_barcode_code_unique TO students_qr_code_unique');

            return;
        }

        Schema::table('students', fn ($table) => $table->renameColumn('barcode_code', 'qr_code'));
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE students CHANGE qr_code barcode_code VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE students RENAME INDEX students_qr_code_unique TO students_barcode_code_unique');

            return;
        }

        Schema::table('students', fn ($table) => $table->renameColumn('qr_code', 'barcode_code'));
    }
};
