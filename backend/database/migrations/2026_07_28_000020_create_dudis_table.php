<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DUDI = Dunia Usaha/Dunia Industri, yaitu perusahaan/instansi tempat siswa PKL.
     * Setiap DUDI punya 1 akun login (user_id), dan koordinat lokasi + radius yang
     * dipakai untuk validasi absensi siswa (siswa harus berada dalam radius ini
     * saat absen masuk/pulang).
     */
    public function up(): void
    {
        Schema::create('dudis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            $table->string('nama_perusahaan');
            $table->string('alamat')->nullable();
            $table->string('penanggung_jawab')->nullable();
            $table->string('telepon')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->unsignedInteger('radius_meter')->default(100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dudis');
    }
};
