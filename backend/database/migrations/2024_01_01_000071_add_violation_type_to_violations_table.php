<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->foreignId('violation_type_id')->nullable()->after('attendance_id')->constrained()->onDelete('cascade');
            $table->string('note')->nullable()->after('poin');
            $table->foreignId('recorded_by')->nullable()->after('note')->constrained('users')->onDelete('set null');
        });

        $telatId = DB::table('violation_types')->where('system_key', 'telat')->value('id');
        $alpaId  = DB::table('violation_types')->where('system_key', 'alpa')->value('id');

        if ($telatId) {
            DB::table('violations')->where('type', 'telat')->update(['violation_type_id' => $telatId]);
        }
        if ($alpaId) {
            DB::table('violations')->where('type', 'alpa')->update(['violation_type_id' => $alpaId]);
        }
    }

    public function down(): void
    {
        Schema::table('violations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('violation_type_id');
            $table->dropConstrainedForeignId('recorded_by');
            $table->dropColumn('note');
        });
    }
};
