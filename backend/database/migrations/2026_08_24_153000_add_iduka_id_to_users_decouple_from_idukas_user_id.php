<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * IDUKA (data perusahaan mitra + lokasi/radius GPS) sekarang murni data
     * master — TIDAK lagi terikat 1:1 ke 1 akun login lewat idukas.user_id.
     * Sebagai gantinya, akun login (Instruktur ATAU IDUKA/BKK) menunjuk BALIK
     * ke perusahaan mitranya lewat users.iduka_id — supaya nanti 1 perusahaan
     * bisa punya lebih dari 1 akun Instruktur, dan akun Instruktur cukup
     * MEMILIH perusahaan yang sudah ada (dengan GPS-nya), bukan mengisi ulang
     * data perusahaan + GPS dari nol tiap kali bikin akun instruktur baru.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'iduka_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('iduka_id')->nullable()->after('room_id')->constrained('idukas')->nullOnDelete();
            });

            // Pindahkan data lama: akun yang tadinya "memiliki" 1 baris Iduka
            // (lewat idukas.user_id) sekarang MENUNJUK ke baris itu lewat
            // users.iduka_id — hasil akhirnya sama (User::iduka() tetap
            // mengembalikan perusahaan yang sama seperti sebelumnya), cuma
            // arah relasinya dibalik.
            DB::table('idukas')->whereNotNull('user_id')->orderBy('id')->each(function ($iduka) {
                DB::table('users')->where('id', $iduka->user_id)->update(['iduka_id' => $iduka->id]);
            });
        }

        if (DB::getDriverName() === 'mysql') {
            // Nama constraint FK & unique index aslinya "dudis_user_id_..." —
            // peninggalan dari sebelum tabel dudis diganti nama jadi idukas
            // (MySQL tidak otomatis ganti nama constraint/index saat RENAME
            // TABLE, lihat migrasi rename_dudis_table_to_idukas) — WAJIB
            // disebut eksplisit di sini, bentuk array polos (dropForeign(['user_id']),
            // dropUnique(['user_id'])) akan mencari nama "idukas_user_id_..."
            // yang tidak pernah ada dan gagal.
            Schema::table('idukas', function (Blueprint $table) {
                $table->dropForeign('dudis_user_id_foreign');
                $table->dropUnique('dudis_user_id_unique');
            });
            Schema::table('idukas', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
            });
            Schema::table('idukas', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        } else {
            Schema::table('idukas', function (Blueprint $table) {
                $table->dropUnique(['user_id']);
                $table->unsignedBigInteger('user_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            Schema::table('idukas', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
            Schema::table('idukas', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable(false)->change();
            });
            Schema::table('idukas', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->unique('user_id');
            });
        } else {
            Schema::table('idukas', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable(false)->change();
                $table->unique('user_id');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('iduka_id');
        });
    }
};
