<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * announcements:cleanup-photos sebelumnya memakai created_at (waktu
     * baris pengumuman dibuat) buat memutuskan foto sudah "30 hari"
     * atau belum — padahal foto bisa diganti belakangan lewat
     * uploadFoto() pada pengumuman LAMA, jadi created_at tidak pernah
     * berubah walau fotonya baru saja diunggah. Kolom khusus ini dicatat
     * ulang tiap kali foto di-set/diganti (lihat AnnouncementController),
     * supaya umur foto dihitung dari waktu upload yang sebenarnya.
     */
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->timestamp('foto_uploaded_at')->nullable()->after('foto');
        });

        // Backfill data lama: created_at adalah perkiraan terbaik yang ada
        // untuk baris yang sudah kadung punya foto sebelum kolom ini ada.
        DB::table('announcements')->whereNotNull('foto')->update([
            'foto_uploaded_at' => DB::raw('created_at'),
        ]);
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn('foto_uploaded_at');
        });
    }
};
