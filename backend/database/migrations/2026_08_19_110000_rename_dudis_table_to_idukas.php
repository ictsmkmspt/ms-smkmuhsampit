<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti istilah DUDI jadi IDUKA di seluruh aplikasi (kode & database),
     * bukan cuma tampilan — tabel `dudis` jadi `idukas`. FK constraint/index
     * name lama (mis. `dudis_user_id_foreign`) tetap bernama lama setelah
     * rename tabel (kosmetik saja, MySQL tidak otomatis ganti nama
     * constraint saat RENAME TABLE) — tidak masalah secara fungsional.
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
