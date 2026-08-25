<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Periode/gelombang penerimaan PPDB — SENGAJA tabel terpisah dari
 * tahun_ajarans (tahun ajaran sekolah), karena masa pendaftaran siswa baru
 * seringkali TIDAK beriringan dengan tahun ajaran (mis. PPDB gelombang 1
 * dibuka semasa tahun ajaran sebelumnya masih berjalan). Pola status
 * aktif/nonaktif & aktifId() sengaja meniru TahunAjaran supaya perilakunya
 * familiar, tapi keduanya independen sepenuhnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppdb_periodes', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->enum('status', ['aktif', 'nonaktif'])->default('nonaktif');
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();
            $table->unsignedBigInteger('biaya_nominal_l')->default(0);
            $table->unsignedBigInteger('biaya_nominal_p')->default(0);
            $table->timestamps();
        });

        // Migrasi mulus dari Setting global lama (ppdb_biaya_nominal_l/_p,
        // diisi sebelum fitur periode ini ada) ke 1 periode pertama yang
        // otomatis dibuat aktif — supaya nominal yang sudah diatur admin
        // sebelumnya tidak hilang begitu fitur ini di-deploy.
        $biayaL = (int) (DB::table('settings')->where('key', 'ppdb_biaya_nominal_l')->value('value') ?? 0);
        $biayaP = (int) (DB::table('settings')->where('key', 'ppdb_biaya_nominal_p')->value('value') ?? 0);

        DB::table('ppdb_periodes')->insert([
            'nama' => 'Periode ' . now()->format('Y') . '/' . ((int) now()->format('Y') + 1),
            'status' => 'aktif',
            'tanggal_mulai' => null,
            'tanggal_selesai' => null,
            'biaya_nominal_l' => $biayaL,
            'biaya_nominal_p' => $biayaP,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('ppdb_periodes');
    }
};
