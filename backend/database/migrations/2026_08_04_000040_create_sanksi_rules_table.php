<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sanksi_rules', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->unsignedInteger('min_poin');
            $table->unsignedInteger('max_poin')->nullable(); // null = tidak terbatas ke atas
            $table->text('tindakan');
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanksi_rules');
    }
};
