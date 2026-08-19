<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Setoran yang tercatat SEBELUM tabel spp_pembayaran/tagihan_lain_pembayaran
     * ada (migrasi sebelumnya) cuma pernah tersimpan sebagai jumlah_dibayar/
     * tanggal_bayar di baris induk — tidak mungkin punya baris riwayat karena
     * tabel riwayatnya belum ada waktu itu. Laporan Keuangan Bulanan (yang
     * sekarang membaca dari riwayat, bukan induk) jadi "kehilangan" seluruh
     * uang lama itu meski Dashboard (yang membaca dari induk) masih
     * menampilkannya — makanya total di Dashboard & Ringkasan tidak sama.
     * Backfill ini membuat 1 baris riwayat per tagihan lama yang belum
     * punya riwayat sama sekali, memakai jumlah_dibayar/tanggal_bayar/
     * dicatat_oleh yang sudah ada di induk, supaya kedua laporan konsisten.
     */
    public function up(): void
    {
        $now = now();

        DB::table('spps')
            ->where('jumlah_dibayar', '>', 0)
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('spp_pembayaran')
                    ->whereColumn('spp_pembayaran.spp_id', 'spps.id');
            })
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($now) {
                $insert = $rows->map(fn ($spp) => [
                    'spp_id' => $spp->id,
                    'jumlah' => $spp->jumlah_dibayar,
                    'tanggal_bayar' => $spp->tanggal_bayar,
                    'dicatat_oleh' => $spp->dicatat_oleh,
                    'keterangan' => 'Migrasi data lama (sebelum riwayat pembayaran ada)',
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();
                DB::table('spp_pembayaran')->insert($insert);
            });

        DB::table('tagihan_lains')
            ->where('jumlah_dibayar', '>', 0)
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('tagihan_lain_pembayaran')
                    ->whereColumn('tagihan_lain_pembayaran.tagihan_lain_id', 'tagihan_lains.id');
            })
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($now) {
                $insert = $rows->map(fn ($t) => [
                    'tagihan_lain_id' => $t->id,
                    'jumlah' => $t->jumlah_dibayar,
                    'tanggal_bayar' => $t->tanggal_bayar,
                    'dicatat_oleh' => $t->dicatat_oleh,
                    'keterangan' => 'Migrasi data lama (sebelum riwayat pembayaran ada)',
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();
                DB::table('tagihan_lain_pembayaran')->insert($insert);
            });
    }

    public function down(): void
    {
        DB::table('spp_pembayaran')->where('keterangan', 'Migrasi data lama (sebelum riwayat pembayaran ada)')->delete();
        DB::table('tagihan_lain_pembayaran')->where('keterangan', 'Migrasi data lama (sebelum riwayat pembayaran ada)')->delete();
    }
};
