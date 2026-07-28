<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Absensi PKL berbasis radius lokasi — menggantikan absensi barcode sekolah
     * selama siswa berstatus PKL. 1 baris = 1 siswa untuk 1 tanggal, berisi jam
     * masuk & jam pulang beserta koordinat GPS dan jarak ke lokasi DUDI saat itu.
     *
     * Pengecekan radius (siswa harus berada dalam radius_meter milik DUDI) selalu
     * dilakukan di controller saat siswa absen sendiri lewat GPS — kalau di luar
     * radius, absen ditolak dan baris ini TIDAK dibuat lewat jalur itu.
     *
     * Kolom corrected_by/catatan_koreksi dipakai saat DUDI/guru pembimbing/admin
     * membuat atau memperbaiki catatan absensi secara manual (misal GPS siswa
     * bermasalah, atau untuk mencatat izin/sakit/alpa yang memang tidak lewat GPS).
     */
    public function up(): void
    {
        Schema::create('pkl_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pkl_placement_id')->constrained()->onDelete('cascade');
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->date('date');

            $table->time('time_in')->nullable();
            $table->decimal('latitude_in', 10, 7)->nullable();
            $table->decimal('longitude_in', 10, 7)->nullable();
            $table->unsignedInteger('distance_in_meter')->nullable();

            $table->time('time_out')->nullable();
            $table->decimal('latitude_out', 10, 7)->nullable();
            $table->decimal('longitude_out', 10, 7)->nullable();
            $table->unsignedInteger('distance_out_meter')->nullable();

            $table->enum('status', ['hadir', 'izin', 'sakit', 'alpa'])->default('hadir');
            $table->foreignId('corrected_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('catatan_koreksi')->nullable();

            $table->timestamps();

            $table->unique(['pkl_placement_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pkl_attendances');
    }
};
