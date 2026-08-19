<?php

namespace App\Http\Controllers\Api;

use App\Exports\BukuTemplateExport;
use App\Http\Controllers\Controller;
use App\Imports\BukuImport;
use App\Models\Buku;
use App\Models\BukuEksemplar;
use App\Models\PerpustakaanPeminjaman;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Katalog buku (judul) + eksemplar (salinan fisik, tiap eksemplar kode QR
 * sendiri — lihat migrasi perpustakaan_eksemplar). Pengurus perpus kelola
 * penuh, siswa cuma baca (dipakai juga oleh index() yang sama, filter
 * role-nya di routes/api.php, bukan di sini — response-nya SAMA utk kedua
 * role, cuma hitungan agregat per status, tidak membocorkan apa-apa).
 */
class BukuController extends Controller
{
    private function generateKodeEksemplar(): string
    {
        return 'BUKU-' . strtoupper(Str::random(8));
    }

    private function ringkasEksemplar(Buku $buku): array
    {
        $counts = $buku->eksemplars()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');
        return [
            'tersedia' => (int) ($counts['tersedia'] ?? 0),
            'dipinjam' => (int) ($counts['dipinjam'] ?? 0),
            'rusak' => (int) ($counts['rusak'] ?? 0),
            'hilang' => (int) ($counts['hilang'] ?? 0),
        ];
    }

    public function index()
    {
        return Buku::with(['kategori', 'rak'])->orderBy('judul')->get()->map(function ($buku) {
            $ringkasan = $this->ringkasEksemplar($buku);
            $buku->setAttribute('jumlah_eksemplar', array_sum($ringkasan));
            $buku->setAttribute('ringkasan_eksemplar', $ringkasan);
            return $buku;
        });
    }

    /**
     * Kartu ringkasan angka di halaman utama dashboard pengurus — supaya
     * langsung kelihatan sekilas tanpa harus buka tab Peminjaman dulu.
     */
    public function ringkasan()
    {
        $eksemplar = BukuEksemplar::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return response()->json([
            'total_judul' => Buku::count(),
            'total_eksemplar' => (int) $eksemplar->sum(),
            'tersedia' => (int) ($eksemplar['tersedia'] ?? 0),
            'dipinjam' => (int) ($eksemplar['dipinjam'] ?? 0),
            'terlambat' => PerpustakaanPeminjaman::where('status', 'dipinjam')
                ->whereDate('tanggal_jatuh_tempo', '<', now()->toDateString())
                ->count(),
        ]);
    }

    /**
     * Detail 1 buku + daftar LENGKAP eksemplarnya (kode + status per
     * salinan fisik) — dipakai pengurus buat kelola eksemplar satu-satu.
     */
    public function show(Buku $buku)
    {
        $buku->load(['kategori', 'rak', 'eksemplars' => fn ($q) => $q->orderBy('kode_eksemplar')]);
        return $buku;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'judul' => 'required|string|max:200',
            'kode_buku' => 'nullable|string|max:50|unique:perpustakaan_buku,kode_buku',
            'penulis' => 'nullable|string|max:150',
            'penerbit' => 'nullable|string|max:150',
            'tahun_terbit' => 'nullable|integer|min:1900|max:2100',
            'isbn' => 'nullable|string|max:30',
            'kategori_id' => 'nullable|integer|exists:perpustakaan_kategori,id',
            'sinopsis' => 'nullable|string',
            'rak_id' => 'nullable|integer|exists:perpustakaan_rak,id',
            'jumlah_eksemplar' => 'nullable|integer|min:0|max:200',
            'cover' => 'nullable|image|max:2048',
        ]);

        $jumlahEksemplar = (int) ($data['jumlah_eksemplar'] ?? 0);
        unset($data['jumlah_eksemplar']);
        $data['kategori_id'] = empty($data['kategori_id']) ? null : $data['kategori_id'];
        $data['rak_id'] = empty($data['rak_id']) ? null : $data['rak_id'];

        if ($request->hasFile('cover')) {
            $data['cover'] = $request->file('cover')->store('perpustakaan-cover', 'public');
        }

        $data['dibuat_oleh'] = $request->user()->id;

        $buku = Buku::create($data);

        for ($i = 0; $i < $jumlahEksemplar; $i++) {
            $buku->eksemplars()->create(['kode_eksemplar' => $this->generateKodeEksemplar()]);
        }

        return response()->json($buku->fresh(['eksemplars', 'kategori', 'rak']), 201);
    }

    public function update(Request $request, Buku $buku)
    {
        $data = $request->validate([
            'judul' => 'required|string|max:200',
            'kode_buku' => 'nullable|string|max:50|unique:perpustakaan_buku,kode_buku,' . $buku->id,
            'penulis' => 'nullable|string|max:150',
            'penerbit' => 'nullable|string|max:150',
            'tahun_terbit' => 'nullable|integer|min:1900|max:2100',
            'isbn' => 'nullable|string|max:30',
            'kategori_id' => 'nullable|integer|exists:perpustakaan_kategori,id',
            'sinopsis' => 'nullable|string',
            'rak_id' => 'nullable|integer|exists:perpustakaan_rak,id',
        ]);

        $data['kategori_id'] = empty($data['kategori_id']) ? null : $data['kategori_id'];
        $data['rak_id'] = empty($data['rak_id']) ? null : $data['rak_id'];
        $buku->update($data);

        return $buku->fresh(['kategori', 'rak']);
    }

    /**
     * Endpoint terpisah dari update() (bukan PUT+multipart) — pola sama
     * AnnouncementController::uploadFoto / IdukaController::uploadTandaTangan.
     */
    public function uploadCover(Request $request, Buku $buku)
    {
        $request->validate(['cover' => 'required|image|max:2048']);

        if ($buku->cover) {
            Storage::disk('public')->delete($buku->cover);
        }
        $buku->update(['cover' => $request->file('cover')->store('perpustakaan-cover', 'public')]);

        return $buku->fresh();
    }

    public function destroy(Buku $buku)
    {
        if ($buku->eksemplars()->where('status', 'dipinjam')->exists()) {
            return response()->json(['message' => 'Masih ada eksemplar buku ini yang sedang dipinjam, tidak bisa dihapus.'], 422);
        }

        // Eksemplar yang PERNAH punya riwayat peminjaman (walau sekarang
        // tersedia/rusak/hilang) sengaja diblok juga — supaya riwayatnya
        // tidak ikut hilang (FK sekarang RESTRICT, bukan cascade, tapi
        // dicek dulu di sini biar pesannya jelas, bukan error DB mentah).
        if (PerpustakaanPeminjaman::whereIn('eksemplar_id', $buku->eksemplars()->pluck('id'))->exists()) {
            return response()->json(['message' => 'Buku ini punya riwayat peminjaman — tidak bisa dihapus supaya riwayatnya tetap tersimpan. Ubah status eksemplarnya jadi "hilang" kalau memang sudah tidak ada, jangan dihapus.'], 422);
        }

        if ($buku->cover) {
            Storage::disk('public')->delete($buku->cover);
        }
        $buku->delete();

        return response()->json(['message' => 'Buku berhasil dihapus.']);
    }

    public function tambahEksemplar(Request $request, Buku $buku)
    {
        $data = $request->validate(['jumlah' => 'required|integer|min:1|max:200']);

        $baru = [];
        for ($i = 0; $i < $data['jumlah']; $i++) {
            $baru[] = $buku->eksemplars()->create(['kode_eksemplar' => $this->generateKodeEksemplar()]);
        }

        return response()->json($baru, 201);
    }

    public function ubahStatusEksemplar(Request $request, BukuEksemplar $eksemplar)
    {
        if ($eksemplar->status === 'dipinjam') {
            return response()->json(['message' => 'Eksemplar sedang dipinjam — proses lewat menu Kembali dulu, bukan diubah langsung.'], 422);
        }

        $data = $request->validate(['status' => 'required|in:tersedia,rusak,hilang']);
        $eksemplar->update($data);

        return $eksemplar->fresh();
    }

    public function hapusEksemplar(BukuEksemplar $eksemplar)
    {
        if ($eksemplar->status === 'dipinjam') {
            return response()->json(['message' => 'Eksemplar sedang dipinjam, tidak bisa dihapus.'], 422);
        }

        if ($eksemplar->peminjaman()->exists()) {
            return response()->json(['message' => 'Eksemplar ini punya riwayat peminjaman — tidak bisa dihapus supaya riwayatnya tetap tersimpan. Ubah status jadi "hilang" kalau memang sudah tidak ada, jangan dihapus.'], 422);
        }

        $eksemplar->delete();

        return response()->json(['message' => 'Eksemplar dihapus.']);
    }

    /**
     * Daftar rata semua eksemplar (judul + kode) dipakai halaman cetak
     * label QR — pola sama PrintAssetLabels.jsx yang generate QR di sisi
     * frontend dari daftar kode mentah.
     */
    public function semuaEksemplarUntukCetak(Request $request)
    {
        $query = BukuEksemplar::with('buku')->orderBy('buku_id');
        if ($request->filled('buku_id')) {
            $query->where('buku_id', $request->buku_id);
        }

        return $query->get()->map(fn ($e) => [
            'id' => $e->id,
            'kode_eksemplar' => $e->kode_eksemplar,
            'judul' => $e->buku->judul,
        ]);
    }

    public function downloadTemplate()
    {
        return Excel::download(new BukuTemplateExport, 'template_import_buku.xlsx');
    }

    public function importExcel(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:xlsx,xls,csv']);

        $import = new BukuImport($request->user()->id);
        Excel::import($import, $request->file('file'));

        return response()->json([
            'message' => "{$import->successCount} buku berhasil diimport, " . count($import->gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal' => $import->gagal,
        ]);
    }
}
