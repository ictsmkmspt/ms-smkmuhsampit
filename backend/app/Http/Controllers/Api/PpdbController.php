<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PpdbPendaftar;
use App\Models\Setting;
use Illuminate\Http\Request;

class PpdbController extends Controller
{
    private const SETTING_KEY = 'ppdb_dibuka';

    /**
     * Status buka/tutup pendaftaran online — publik, dipakai halaman
     * formulir buat tahu apakah formulir boleh ditampilkan/dikirim.
     */
    public function pengaturan()
    {
        return response()->json(['dibuka' => Setting::get(self::SETTING_KEY, '1') === '1']);
    }

    /**
     * Waka Humas menyalakan/mematikan pendaftaran online — dipisah dari
     * SettingController (yang isinya jam masuk, punya Waka Kesiswaan) supaya
     * tiap Waka cuma punya endpoint pengaturan di domainnya sendiri.
     */
    public function updatePengaturan(Request $request)
    {
        $data = $request->validate(['dibuka' => 'required|boolean']);

        Setting::set(self::SETTING_KEY, $data['dibuka'] ? '1' : '0');

        return response()->json([
            'message' => $data['dibuka'] ? 'Pendaftaran online PPDB dibuka.' : 'Pendaftaran online PPDB ditutup.',
            'dibuka' => $data['dibuka'],
        ]);
    }

    /**
     * Formulir pendaftaran publik — calon siswa belum punya akun sama
     * sekali di sistem, jadi endpoint ini sengaja TIDAK dilindungi auth.
     */
    public function daftar(Request $request)
    {
        if (Setting::get(self::SETTING_KEY, '1') !== '1') {
            return response()->json(['message' => 'Pendaftaran online sedang ditutup.'], 422);
        }

        // Honeypot: field tersembunyi di formulir yang bot pengisi-otomatis
        // biasanya ikut isi tapi manusia tidak pernah lihat (disembunyikan
        // lewat CSS di frontend). Kalau terisi, diam-diam anggap sukses
        // (supaya bot tidak tahu ditolak & terus mencoba pola lain) tanpa
        // benar-benar menyimpan apa pun.
        if ($request->filled('website')) {
            return response()->json([
                'message' => 'Pendaftaran berhasil. Simpan kode pendaftaran untuk mengecek status.',
                'kode_pendaftaran' => PpdbPendaftar::buatKodePendaftaran(),
            ], 201);
        }

        $data = $request->validate([
            'nama_lengkap' => 'required|string|max:150',
            'nisn' => 'nullable|regex:/^[0-9]{5,20}$/',
            'jenis_kelamin' => 'required|in:L,P',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date|before:today',
            'alamat' => 'nullable|string|max:500',
            'asal_sekolah' => 'nullable|string|max:150',
            'nama_orang_tua' => 'nullable|string|max:150',
            'no_hp_orang_tua' => ['required', 'string', 'regex:/^[0-9+\-\s]{8,20}$/'],
            'jurusan_pilihan' => 'nullable|string|max:100',
        ]);

        $data['kode_pendaftaran'] = PpdbPendaftar::buatKodePendaftaran();
        $data['status'] = 'mendaftar';

        $pendaftar = PpdbPendaftar::create($data);

        return response()->json([
            'message' => 'Pendaftaran berhasil. Simpan kode pendaftaran untuk mengecek status.',
            'kode_pendaftaran' => $pendaftar->kode_pendaftaran,
        ], 201);
    }

    /**
     * Cek status publik pakai kode pendaftaran — cuma info yang aman
     * ditampilkan ke publik, bukan seluruh data pribadi pendaftar.
     */
    public function status($kode)
    {
        $pendaftar = PpdbPendaftar::where('kode_pendaftaran', $kode)->first();

        if (!$pendaftar) {
            return response()->json(['message' => 'Kode pendaftaran tidak ditemukan.'], 404);
        }

        return response()->json([
            'kode_pendaftaran' => $pendaftar->kode_pendaftaran,
            'nama_lengkap' => $pendaftar->nama_lengkap,
            'status' => $pendaftar->status,
            'catatan' => $pendaftar->catatan,
        ]);
    }

    /**
     * Input pendaftar PPDB OFFLINE (calon siswa daftar langsung ke sekolah,
     * bukan lewat formulir publik) — Admin yang mengisikan datanya. Sengaja
     * TIDAK lewat daftar() di atas: tidak perlu cek "pendaftaran online
     * dibuka?" (offline tetap bisa diterima walau online sedang ditutup)
     * dan tidak ada honeypot bot (yang mengisi Admin sendiri). Hasilnya
     * masuk ke tabel ppdb_pendaftars YANG SAMA seperti pendaftar online —
     * jadi langsung tergabung 1 daftar, bisa diverifikasi/diterima/ditarik
     * jadi siswa resmi lewat alur yang sama persis.
     */
    public function storeManual(Request $request)
    {
        $data = $request->validate([
            'nama_lengkap' => 'required|string|max:150',
            'nisn' => 'nullable|regex:/^[0-9]{5,20}$/',
            'jenis_kelamin' => 'required|in:L,P',
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date|before:today',
            'alamat' => 'nullable|string|max:500',
            'asal_sekolah' => 'nullable|string|max:150',
            'nama_orang_tua' => 'nullable|string|max:150',
            'no_hp_orang_tua' => ['required', 'string', 'regex:/^[0-9+\-\s]{8,20}$/'],
            'jurusan_pilihan' => 'nullable|string|max:100',
            'status' => 'nullable|in:mendaftar,verifikasi,diterima,ditolak',
            'catatan' => 'nullable|string',
        ]);

        $data['kode_pendaftaran'] = PpdbPendaftar::buatKodePendaftaran();
        $data['status'] = $data['status'] ?? 'mendaftar';

        $pendaftar = PpdbPendaftar::create($data);

        return response()->json($pendaftar, 201);
    }

    public function index(Request $request)
    {
        $query = PpdbPendaftar::orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->get();
    }

    public function update(Request $request, PpdbPendaftar $ppdbPendaftar)
    {
        $data = $request->validate([
            'status' => 'required|in:mendaftar,verifikasi,diterima,ditolak',
            'catatan' => 'nullable|string',
        ]);

        $ppdbPendaftar->update($data);

        return $ppdbPendaftar->fresh();
    }

    public function destroy(PpdbPendaftar $ppdbPendaftar)
    {
        $ppdbPendaftar->delete();

        return response()->json(['message' => 'Data pendaftar PPDB dihapus.']);
    }
}
