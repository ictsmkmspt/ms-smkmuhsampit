<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Guru butuh kode scan sendiri (pola sama Student::barcode_code) supaya
     * bisa jadi peminjam buku lewat meja sirkulasi — prefix "GRU-" beda
     * dari siswa ("STD-") supaya gampang dibedakan sekilas.
     */
    public function up(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->string('barcode_code')->nullable()->unique()->after('nip');
        });

        DB::table('teachers')->whereNull('barcode_code')->orderBy('id')->pluck('id')->each(function ($id) {
            DB::table('teachers')->where('id', $id)->update([
                'barcode_code' => 'GRU-' . strtoupper(Str::random(8)),
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('barcode_code');
        });
    }
};
