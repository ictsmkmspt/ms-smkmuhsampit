<?php

namespace App\Console\Commands;

use App\Models\Student;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sanksi:backfill-kejadian')]
#[Description('Cek ulang total_poin semua siswa aktif terhadap aturan Sanksi Bertingkat saat ini dan buat SanksiKejadian yang terlewat (aman dijalankan berulang, sudah dicegah duplikat).')]
class SanksiBackfillKejadian extends Command
{
    public function handle()
    {
        $students = Student::where('status', 'aktif')->where('total_poin', '>', 0)->get();

        $sebelum = \App\Models\SanksiKejadian::count();

        foreach ($students as $student) {
            $student->deteksiSanksiKejadian();
        }

        $dibuat = \App\Models\SanksiKejadian::count() - $sebelum;

        $this->info("Selesai. {$students->count()} siswa dicek, {$dibuat} kejadian sanksi baru dibuat.");
    }
}
