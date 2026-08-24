<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Soal sekarang bisa 2 tipe: pilihan ganda (pg, seperti sebelumnya) atau
    // essay (dikoreksi manual guru — lihat CbtEssayController). Pilihan &
    // jawaban_benar jadi NULLABLE karena essay tidak butuh keduanya. Bobot
    // per soal ditambah (skor tidak lagi rata 100/jumlah soal) + pilihan
    // ke-5 (E) mengikuti cbtv145.
    public function up(): void
    {
        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->string('tipe', 10)->default('pg')->after('subject_id');
            $table->unsignedInteger('bobot')->default(10)->after('jawaban_benar');
            $table->longText('pilihan_e')->nullable()->after('pilihan_d');
        });

        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->longText('pilihan_a')->nullable()->change();
            $table->longText('pilihan_b')->nullable()->change();
            $table->longText('pilihan_c')->nullable()->change();
            $table->longText('pilihan_d')->nullable()->change();
        });

        // enum tidak bisa diubah langsung via change() di semua driver —
        // pakai raw statement supaya pasti jalan (MySQL/MariaDB).
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE cbt_questions MODIFY jawaban_benar ENUM('A','B','C','D','E') NULL");
        } else {
            Schema::table('cbt_questions', function (Blueprint $table) {
                $table->enum('jawaban_benar', ['A', 'B', 'C', 'D', 'E'])->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE cbt_questions MODIFY jawaban_benar ENUM('A','B','C','D') NOT NULL");
        } else {
            Schema::table('cbt_questions', function (Blueprint $table) {
                $table->enum('jawaban_benar', ['A', 'B', 'C', 'D'])->nullable(false)->change();
            });
        }

        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->longText('pilihan_a')->nullable(false)->change();
            $table->longText('pilihan_b')->nullable(false)->change();
            $table->longText('pilihan_c')->nullable(false)->change();
            $table->longText('pilihan_d')->nullable(false)->change();
        });

        Schema::table('cbt_questions', function (Blueprint $table) {
            $table->dropColumn(['tipe', 'bobot', 'pilihan_e']);
        });
    }
};
