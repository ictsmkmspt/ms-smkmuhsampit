<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti istilah "DUDI" jadi "IDUKA" (Industri, Dunia Usaha, dan Dunia
     * Kerja) di seluruh sistem — dimulai dari nama tabelnya.
     */
    public function up(): void
    {
        Schema::rename('dudis', 'idukas');
    }

    public function down(): void
    {
        Schema::rename('idukas', 'dudis');
    }
};
