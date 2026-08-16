<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Istilah "barcode" diganti "QR Code" di seluruh aplikasi (kode yang
     * dihasilkan & dipindai memang selalu QR Code, bukan barcode 1D) —
     * kolomnya ikut disamakan namanya, termasuk nama unique index-nya
     * (RENAME INDEX, bukan drop+create ulang, supaya tidak ada jeda tanpa
     * constraint unik).
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE students CHANGE barcode_code qr_code VARCHAR(255) NOT NULL');
        DB::statement('ALTER TABLE students RENAME INDEX students_barcode_code_unique TO students_qr_code_unique');

        DB::statement('ALTER TABLE teachers CHANGE barcode_code qr_code VARCHAR(255) NULL');
        DB::statement('ALTER TABLE teachers RENAME INDEX teachers_barcode_code_unique TO teachers_qr_code_unique');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE students CHANGE qr_code barcode_code VARCHAR(255) NOT NULL');
        DB::statement('ALTER TABLE students RENAME INDEX students_qr_code_unique TO students_barcode_code_unique');

        DB::statement('ALTER TABLE teachers CHANGE qr_code barcode_code VARCHAR(255) NULL');
        DB::statement('ALTER TABLE teachers RENAME INDEX teachers_qr_code_unique TO teachers_barcode_code_unique');
    }
};
