<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Log aktivitas global — diisi otomatis lewat event Eloquent
     * created/updated/deleted yang didaftarkan sekali di
     * AppServiceProvider::boot() untuk semua model, plus login/logout
     * manual dari AuthController. user_id nullable karena aksi dari
     * console/scheduler tidak selalu ada user yang login. actor_nama/
     * actor_role disalin (snapshot) supaya baris log tetap terbaca kalau
     * user-nya sendiri sudah dihapus kemudian.
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('actor_nama', 100)->nullable();
            $table->string('actor_role', 30)->nullable();
            $table->string('aksi', 20);
            $table->string('model_type', 60)->nullable();
            $table->unsignedBigInteger('model_id')->nullable();
            $table->string('model_label', 150)->nullable();
            $table->json('perubahan')->nullable();
            $table->timestamps();

            $table->index(['model_type', 'model_id']);
            $table->index('user_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
