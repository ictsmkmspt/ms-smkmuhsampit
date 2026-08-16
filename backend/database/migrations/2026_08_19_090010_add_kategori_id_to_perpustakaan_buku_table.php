<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti kolom "kategori" bebas-teks jadi FK ke perpustakaan_kategori.
     * Nilai kategori bebas-teks yang sudah ada (kalau ada) DIBACKFILL dulu
     * jadi baris perpustakaan_kategori sebelum kolom lama dihapus, supaya
     * tidak ada data buku yang kehilangan kategorinya.
     */
    public function up(): void
    {
        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->foreignId('kategori_id')->nullable()->after('kode_buku')
                ->constrained('perpustakaan_kategori')->nullOnDelete();
        });

        $nilaiLama = DB::table('perpustakaan_buku')
            ->whereNotNull('kategori')
            ->where('kategori', '!=', '')
            ->distinct()
            ->pluck('kategori');

        foreach ($nilaiLama as $nama) {
            $kategoriId = DB::table('perpustakaan_kategori')->where('nama', $nama)->value('id');
            if (!$kategoriId) {
                $kategoriId = DB::table('perpustakaan_kategori')->insertGetId([
                    'nama' => $nama, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('perpustakaan_buku')->where('kategori', $nama)->update(['kategori_id' => $kategoriId]);
        }

        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->dropColumn('kategori');
        });
    }

    public function down(): void
    {
        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->string('kategori')->nullable()->after('kode_buku');
        });

        $rows = DB::table('perpustakaan_buku')->whereNotNull('kategori_id')->get(['id', 'kategori_id']);
        foreach ($rows as $row) {
            $nama = DB::table('perpustakaan_kategori')->where('id', $row->kategori_id)->value('nama');
            DB::table('perpustakaan_buku')->where('id', $row->id)->update(['kategori' => $nama]);
        }

        Schema::table('perpustakaan_buku', function (Blueprint $table) {
            $table->dropConstrainedForeignId('kategori_id');
        });
    }
};
