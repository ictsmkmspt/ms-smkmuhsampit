<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Dukungan bayar sebagian (cicilan) untuk SPP & Tagihan Lain — kolom
     * jumlah_dibayar menyimpan akumulasi yang sudah dibayar, dan status bisa
     * "sebagian" (di antara belum_bayar dan lunas). Data lama disesuaikan:
     * yang statusnya sudah "lunas" dianggap sudah dibayar penuh.
     */
    public function up(): void
    {
        Schema::table('spps', function (Blueprint $table) {
            $table->unsignedInteger('jumlah_dibayar')->default(0)->after('nominal');
        });
        Schema::table('spps', function (Blueprint $table) {
            $table->enum('status', ['belum_bayar', 'sebagian', 'lunas'])->default('belum_bayar')->change();
        });
        DB::statement("UPDATE spps SET jumlah_dibayar = nominal WHERE status = 'lunas'");

        Schema::table('tagihan_lains', function (Blueprint $table) {
            $table->unsignedInteger('jumlah_dibayar')->default(0)->after('nominal');
        });
        Schema::table('tagihan_lains', function (Blueprint $table) {
            $table->enum('status', ['belum_bayar', 'sebagian', 'lunas'])->default('belum_bayar')->change();
        });
        DB::statement("UPDATE tagihan_lains SET jumlah_dibayar = nominal WHERE status = 'lunas'");
    }

    public function down(): void
    {
        Schema::table('spps', function (Blueprint $table) {
            $table->dropColumn('jumlah_dibayar');
        });
        Schema::table('spps', function (Blueprint $table) {
            $table->enum('status', ['belum_bayar', 'lunas'])->default('belum_bayar')->change();
        });

        Schema::table('tagihan_lains', function (Blueprint $table) {
            $table->dropColumn('jumlah_dibayar');
        });
        Schema::table('tagihan_lains', function (Blueprint $table) {
            $table->enum('status', ['belum_bayar', 'lunas'])->default('belum_bayar')->change();
        });
    }
};
