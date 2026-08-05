<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TahunAjaranController extends Controller
{
    public function index()
    {
        return TahunAjaran::orderByDesc('created_at')->get();
    }

    public function store(Request $request)
    {
        $request->merge(['nama' => trim((string) $request->input('nama'))]);

        $data = $request->validate([
            'nama' => ['required', 'string', 'max:20', 'regex:/^\d{4}\/\d{4}$/', 'unique:tahun_ajarans,nama'],
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
        ], [
            'nama.regex' => 'Format nama tahun ajaran harus "YYYY/YYYY", contoh: 2027/2028.',
        ]);

        $tahunAjaran = TahunAjaran::create([
            'nama' => $data['nama'],
            'status' => 'nonaktif',
            'tanggal_mulai' => $data['tanggal_mulai'] ?? null,
            'tanggal_selesai' => $data['tanggal_selesai'] ?? null,
        ]);

        return response()->json($tahunAjaran, 201);
    }

    /**
     * Hanya tanggal mulai/selesai kalender akademik yang bisa diubah setelah
     * dibuat — nama & status tetap lewat aktifkan()/destroy() supaya alur
     * pengaktifan/penghapusan yang sudah ada tidak bercabang.
     */
    public function update(Request $request, $id)
    {
        $tahunAjaran = TahunAjaran::findOrFail($id);

        $data = $request->validate([
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date|after_or_equal:tanggal_mulai',
        ]);

        $tahunAjaran->update($data);

        return $tahunAjaran->fresh();
    }

    /**
     * Aktifkan 1 tahun ajaran (menonaktifkan yang lain) — dari sini dan
     * seterusnya, pelanggaran/prestasi/penempatan PKL baru otomatis masuk
     * tahun ajaran ini. `total_poin`/`total_prestasi` tiap siswa DIHITUNG
     * ULANG dari riwayat Violation/Achievement milik tahun ajaran yang baru
     * diaktifkan ini (bukan di-nol-kan paksa) — untuk tahun ajaran baru yang
     * belum ada riwayatnya, hasilnya otomatis 0; tapi kalau suatu saat balik
     * lagi ke tahun ajaran lama, angkanya otomatis muncul benar lagi. Tidak
     * ada data (Violation/Achievement/PklPlacement) yang dihapus sama sekali.
     * Hanya siswa berstatus aktif yang dihitung ulang — siswa alumni tidak
     * ikut tahun ajaran baru sama sekali, jadi total poin historisnya harus
     * tetap seperti terakhir kali dia masih aktif, bukan ikut ter-nol-kan.
     */
    public function aktifkan($id)
    {
        $tahunAjaran = TahunAjaran::findOrFail($id);

        DB::transaction(function () use ($tahunAjaran) {
            // Kunci semua baris tahun_ajarans dulu supaya 2 permintaan aktifkan()
            // yang datang bersamaan tidak bisa keduanya lolos jadi "aktif" —
            // permintaan kedua menunggu transaksi pertama selesai baru jalan.
            TahunAjaran::lockForUpdate()->get();

            TahunAjaran::where('id', '!=', $tahunAjaran->id)->update(['status' => 'nonaktif']);
            $tahunAjaran->update(['status' => 'aktif']);

            DB::statement(
                "UPDATE students SET
                    total_poin = COALESCE((SELECT SUM(poin) FROM violations WHERE violations.student_id = students.id AND violations.tahun_ajaran_id = ?), 0),
                    total_prestasi = COALESCE((SELECT SUM(poin) FROM achievements WHERE achievements.student_id = students.id AND achievements.tahun_ajaran_id = ?), 0)
                WHERE students.status = 'aktif'",
                [$tahunAjaran->id, $tahunAjaran->id]
            );
        });

        return response()->json([
            'message' => "Tahun ajaran {$tahunAjaran->nama} sekarang aktif. Poin pelanggaran & prestasi semua siswa aktif disesuaikan ke riwayat tahun ajaran ini — tidak ada data yang dihapus.",
        ]);
    }

    /**
     * Tahun ajaran yang sedang aktif tidak boleh dihapus, begitu juga tahun
     * ajaran yang masih punya riwayat (pelanggaran/prestasi/PKL/absensi)
     * terkait — kolom tahun_ajaran_id di tabel-tabel itu di-set NULL kalau
     * tahun ajarannya dihapus (bukan ikut terhapus), yang membuat riwayat itu
     * jadi tidak terlihat lagi selamanya di semua laporan yang memfilter per
     * tahun ajaran. Jadi hapus hanya diizinkan untuk tahun ajaran kosong
     * (misal salah ketik saat dibuat).
     */
    public function destroy($id)
    {
        $tahunAjaran = TahunAjaran::findOrFail($id);

        if ($tahunAjaran->status === 'aktif') {
            return response()->json(['message' => 'Tidak bisa menghapus tahun ajaran yang sedang aktif.'], 422);
        }

        $punyaRiwayat = $tahunAjaran->violations()->exists()
            || $tahunAjaran->achievements()->exists()
            || $tahunAjaran->pklPlacements()->exists()
            || $tahunAjaran->attendances()->exists()
            || $tahunAjaran->prayerAttendances()->exists();

        if ($punyaRiwayat) {
            return response()->json(['message' => 'Tidak bisa menghapus tahun ajaran ini karena masih ada riwayat pelanggaran/prestasi/absensi/PKL yang tercatat di dalamnya.'], 422);
        }

        $tahunAjaran->delete();

        return response()->json(['message' => 'Tahun ajaran dihapus.']);
    }
}
