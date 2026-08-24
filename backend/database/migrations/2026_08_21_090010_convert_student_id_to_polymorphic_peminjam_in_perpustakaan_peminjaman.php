<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti FK "student_id" jadi relasi polimorfik peminjam_type/peminjam_id
     * — supaya peminjam buku bisa Siswa ATAU Guru, bukan siswa saja.
     * Morph map didaftarkan di AppServiceProvider ('siswa' => Student::class,
     * 'guru' => Teacher::class), jadi kolom peminjam_type isinya string
     * pendek ('siswa'/'guru'), BUKAN nama kelas lengkap.
     */
    public function up(): void
    {
        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->string('peminjam_type')->nullable()->after('eksemplar_id');
            $table->unsignedBigInteger('peminjam_id')->nullable()->after('peminjam_type');
            $table->index(['peminjam_type', 'peminjam_id']);
        });

        DB::table('perpustakaan_peminjaman')->whereNotNull('student_id')->update([
            'peminjam_type' => 'siswa',
            'peminjam_id' => DB::raw('student_id'),
        ]);

        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->dropForeign(['student_id']);
            $table->dropIndex(['student_id', 'status']);
            $table->dropColumn('student_id');
            $table->string('peminjam_type')->nullable(false)->change();
            $table->unsignedBigInteger('peminjam_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->foreignId('student_id')->nullable()->after('eksemplar_id')->constrained('students')->cascadeOnDelete();
        });

        DB::table('perpustakaan_peminjaman')->where('peminjam_type', 'siswa')->update([
            'student_id' => DB::raw('peminjam_id'),
        ]);

        Schema::table('perpustakaan_peminjaman', function (Blueprint $table) {
            $table->dropIndex(['peminjam_type', 'peminjam_id']);
            $table->dropColumn(['peminjam_type', 'peminjam_id']);
        });
    }
};
