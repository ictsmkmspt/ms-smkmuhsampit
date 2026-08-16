<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti kolom "rak_lokasi" bebas-teks jadi FK ke perpustakaan_rak,
     * pola sama persis dengan migrasi kategori_id — nilai lama dibackfill
     * dulu jadi baris perpustakaan_rak sebelum kolom lama dihapus.
     */
    public function up(): void
    {
        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->foreignId('rak_id')->nullable()->after('kategori_id')
                ->constrained('perpustakaan_rak')->nullOnDelete();
        });

        $nilaiLama = DB::table('perpustakaan_buku')
            ->whereNotNull('rak_lokasi')
            ->where('rak_lokasi', '!=', '')
            ->distinct()
            ->pluck('rak_lokasi');

        foreach ($nilaiLama as $nama) {
            $rakId = DB::table('perpustakaan_rak')->where('nama', $nama)->value('id');
            if (!$rakId) {
                $rakId = DB::table('perpustakaan_rak')->insertGetId([
                    'nama' => $nama, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('perpustakaan_buku')->where('rak_lokasi', $nama)->update(['rak_id' => $rakId]);
        }

        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->dropColumn('rak_lokasi');
        });
    }

    public function down(): void
    {
        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->string('rak_lokasi')->nullable()->after('kategori_id');
        });

        $rows = DB::table('perpustakaan_buku')->whereNotNull('rak_id')->get(['id', 'rak_id']);
        foreach ($rows as $row) {
            $nama = DB::table('perpustakaan_rak')->where('id', $row->rak_id)->value('nama');
            DB::table('perpustakaan_buku')->where('id', $row->id)->update(['rak_lokasi' => $nama]);
        }

        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rak_id');
        });
    }
};
