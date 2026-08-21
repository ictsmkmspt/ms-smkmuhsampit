<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Buku;
use App\Models\BukuEksemplar;
use App\Models\PerpustakaanPeminjaman;
use App\Models\Setting;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Meja sirkulasi — pengurus perpus yang scan (bukan peminjam sendiri, lihat
 * keputusan scope di plan). Peminjam bisa Siswa ATAU Guru (relasi
 * polimorfik peminjam_type/peminjam_id, morph map didaftarkan di
 * AppServiceProvider). Semua lookup pakai path segment (kode eksemplar
 * & kode QR formatnya aman, tidak mengandung '/' seperti kode aset).
 */
class PerpustakaanSirkulasiController extends Controller
{
    private function ringkasPeminjam(Student|Teacher $peminjam): array
    {
        return [
            'aktif' => $peminjam->peminjamanPerpustakaan()->where('status', 'dipinjam')->count(),
            'terlambat' => $peminjam->peminjamanPerpustakaan()->where('status', 'dipinjam')
                ->whereDate('tanggal_jatuh_tempo', '<', now()->toDateString())->count(),
            'riwayat_total' => $peminjam->peminjamanPerpustakaan()->count(),
        ];
    }

    /**
     * Cari peminjam (siswa ATAU guru) dari 1 kode — coba siswa dulu,
     * baru guru, supaya 1 kotak scan/ketik yang sama bisa dipakai untuk
     * keduanya tanpa pengurus perlu pilih tipe dulu.
     */
    private function cariPeminjamByKode(string $kode): ?array
    {
        // status='aktif' — siswa alumni/pindah TIDAK boleh bisa pinjam
        // cuma karena masih bawa kartu QR lama, konsisten dengan
        // cariPeminjamNama() yang sudah lebih dulu memfilter ini.
        $siswa = Student::with(['user', 'classRoom'])
            ->where(fn ($q) => $q->where('qr_code', $kode)->orWhere('nis', $kode))
            ->where('status', 'aktif')
            ->first();
        if ($siswa) {
            return ['tipe' => 'siswa', 'model' => $siswa];
        }

        $guru = Teacher::with('user')
            ->where('qr_code', $kode)->orWhere('nip', $kode)->first();
        if ($guru) {
            return ['tipe' => 'guru', 'model' => $guru];
        }

        return null;
    }

    /**
     * Cari buku by judul (dipakai kedua mode, Pinjam & Kembali) — jalan
     * lain kalau pengurus/peminjam tidak pegang QR fisiknya, cuma tahu
     * judulnya. Tiap eksemplar (kode + status) ikut dikirim supaya
     * pengurus bisa lihat persis eksemplar mana yang mau dipilih (dan
     * frontend menampilkan QR code-nya juga) tanpa perlu scan dulu.
     */
    public function cariBukuJudul(Request $request)
    {
        $data = $request->validate(['q' => 'required|string|min:2']);

        return Buku::where('judul', 'like', '%'.$data['q'].'%')
            ->with(['eksemplars' => fn ($q) => $q->orderBy('kode_eksemplar')])
            ->orderBy('judul')
            ->limit(10)
            ->get(['id', 'judul', 'penulis', 'kode_buku']);
    }

    /**
     * Cari 1 eksemplar buku by kode QR-nya — dipakai kedua mode
     * (Pinjam & Kembali), status-nya dibaca sendiri oleh frontend untuk
     * memutuskan langkah selanjutnya.
     */
    public function cariBuku(string $kode)
    {
        $eksemplar = BukuEksemplar::with('buku')->where('kode_eksemplar', $kode)->first();
        if (!$eksemplar) {
            return response()->json(['message' => 'Kode QR tidak dikenali.'], 404);
        }

        $data = $eksemplar->toArray();
        if ($eksemplar->status === 'dipinjam') {
            $data['peminjaman_aktif'] = $eksemplar->peminjamanAktif()->with('peminjam.user')->first();
        }

        return response()->json($data);
    }

    /**
     * Cari 1 peminjam persis (scan QR Code ATAU ketik NIS/NIP manual) —
     * beserta rekap ringkas biar pengurus lihat riwayatnya SEBELUM
     * konfirmasi pinjaman baru.
     */
    public function cariPeminjamKode(string $kode)
    {
        $hasil = $this->cariPeminjamByKode($kode);
        if (!$hasil) {
            return response()->json(['message' => 'QR Code/NIS/NIP tidak dikenali.'], 404);
        }

        return response()->json($hasil['model']->toArray() + [
            'tipe' => $hasil['tipe'],
            'rekap' => $this->ringkasPeminjam($hasil['model']),
        ]);
    }

    /**
     * Cari peminjam lewat sebagian nama (fallback kalau kartu tidak
     * ke-scan & NIS/NIP tidak diketahui persis) — gabungan siswa+guru,
     * maksimal 10 hasil total.
     */
    public function cariPeminjamNama(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        $siswa = Student::with(['user', 'classRoom'])
            ->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"))
            ->where('status', 'aktif')
            ->limit(10)->get()
            ->map(fn ($s) => $s->toArray() + ['tipe' => 'siswa']);

        $guru = Teacher::with('user')
            ->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"))
            ->limit(10)->get()
            ->map(fn ($g) => $g->toArray() + ['tipe' => 'guru']);

        return response()->json($siswa->concat($guru)->take(10)->values());
    }

    public function pinjam(Request $request)
    {
        $data = $request->validate([
            'eksemplar_id' => 'required|exists:perpustakaan_eksemplar,id',
            'peminjam_type' => 'required|in:siswa,guru',
            'peminjam_id' => 'required|integer',
        ]);

        if ($data['peminjam_type'] === 'siswa') {
            $peminjamValid = Student::whereKey($data['peminjam_id'])->where('status', 'aktif')->exists();
        } else {
            $peminjamValid = Teacher::whereKey($data['peminjam_id'])->exists();
        }
        if (!$peminjamValid) {
            return response()->json(['message' => 'Peminjam tidak ditemukan atau sudah tidak aktif.'], 422);
        }

        return DB::transaction(function () use ($data, $request) {
            $eksemplar = BukuEksemplar::lockForUpdate()->findOrFail($data['eksemplar_id']);
            if ($eksemplar->status !== 'tersedia') {
                return response()->json(['message' => 'Eksemplar ini sedang tidak tersedia untuk dipinjamkan.'], 422);
            }

            $durasi = (int) Setting::get('perpus_durasi_pinjam_hari', '7');
            $peminjaman = PerpustakaanPeminjaman::create([
                'eksemplar_id' => $eksemplar->id,
                'peminjam_type' => $data['peminjam_type'],
                'peminjam_id' => $data['peminjam_id'],
                'diproses_oleh' => $request->user()->id,
                'tanggal_pinjam' => now()->toDateString(),
                'tanggal_jatuh_tempo' => now()->addDays($durasi)->toDateString(),
                'status' => 'dipinjam',
            ]);
            $eksemplar->update(['status' => 'dipinjam']);

            return response()->json($peminjaman->load(['eksemplar.buku', 'peminjam.user']), 201);
        });
    }

    public function kembalikan(Request $request, PerpustakaanPeminjaman $peminjaman)
    {
        $data = $request->validate(['kondisi' => 'required|in:baik,rusak,hilang']);

        return DB::transaction(function () use ($data, $peminjaman) {
            $peminjaman = PerpustakaanPeminjaman::lockForUpdate()->findOrFail($peminjaman->id);
            if ($peminjaman->status !== 'dipinjam') {
                return response()->json(['message' => 'Peminjaman ini sudah diproses sebelumnya.'], 422);
            }

            $statusAkhir = $data['kondisi'] === 'baik' ? 'dikembalikan' : $data['kondisi'];
            $statusEksemplar = $data['kondisi'] === 'baik' ? 'tersedia' : $data['kondisi'];

            $peminjaman->update([
                'tanggal_kembali' => now()->toDateString(),
                'status' => $statusAkhir,
            ]);
            $peminjaman->eksemplar()->update(['status' => $statusEksemplar]);

            return $peminjaman->fresh(['eksemplar.buku', 'peminjam.user']);
        });
    }
}
