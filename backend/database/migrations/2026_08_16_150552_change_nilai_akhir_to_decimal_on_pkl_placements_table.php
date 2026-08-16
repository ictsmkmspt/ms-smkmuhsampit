<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * nilai_akhir dihitung sebagai rata-rata berbobot dengan 2 desimal
     * (mis. 87.33) di PklPenilaianController, tapi kolom cache di
     * pkl_placements sebelumnya unsignedTinyInteger — diam-diam
     * membulatkan/memotong desimalnya begitu disalin ke sini. Disamakan
     * ke decimal(5,2), persis seperti kolom sumbernya di pkl_penilaians.
     */
    public function up(): void
    {
        Schema::table('pkl_placements', function (Blueprint $table) {
            $table->decimal('nilai_akhir', 5, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pkl_placements', function (Blueprint $table) {
            $table->unsignedTinyInteger('nilai_akhir')->nullable()->change();
        });
    }
};
