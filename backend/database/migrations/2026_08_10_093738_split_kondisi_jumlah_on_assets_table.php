<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 1 baris Asset dulu cuma bisa 1 kondisi seragam buat seluruh
     * jumlahnya. Diganti jadi 3 kolom jumlah per kondisi supaya barang
     * sejenis dengan kondisi campuran (mis. 26 hardisk: 6 baik + 20 rusak
     * berat) bisa dicatat dalam 1 baris — data lama dipindah otomatis ke
     * kolom kondisinya masing-masing, tidak ada yang hilang.
     */
    public function up(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->unsignedInteger('jumlah_baik')->default(0)->after('bahan');
            $table->unsignedInteger('jumlah_rusak_ringan')->default(0)->after('jumlah_baik');
            $table->unsignedInteger('jumlah_rusak_berat')->default(0)->after('jumlah_rusak_ringan');
        });

        DB::table('assets')->where('kondisi', 'baik')->update(['jumlah_baik' => DB::raw('jumlah')]);
        DB::table('assets')->where('kondisi', 'rusak_ringan')->update(['jumlah_rusak_ringan' => DB::raw('jumlah')]);
        DB::table('assets')->where('kondisi', 'rusak_berat')->update(['jumlah_rusak_berat' => DB::raw('jumlah')]);

        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn(['kondisi', 'jumlah']);
        });
    }

    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->enum('kondisi', ['baik', 'rusak_ringan', 'rusak_berat'])->default('baik')->after('bahan');
            $table->unsignedInteger('jumlah')->default(1)->after('kondisi');
        });

        DB::table('assets')->where('jumlah_baik', '>', 0)->update(['kondisi' => 'baik', 'jumlah' => DB::raw('jumlah_baik')]);
        DB::table('assets')->where('jumlah_rusak_ringan', '>', 0)->update(['kondisi' => 'rusak_ringan', 'jumlah' => DB::raw('jumlah_rusak_ringan')]);
        DB::table('assets')->where('jumlah_rusak_berat', '>', 0)->update(['kondisi' => 'rusak_berat', 'jumlah' => DB::raw('jumlah_rusak_berat')]);

        Schema::table('assets', function (Blueprint $table) {
            $table->dropColumn(['jumlah_baik', 'jumlah_rusak_ringan', 'jumlah_rusak_berat']);
        });
    }
};
