<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Jurusan;
use App\Models\PpdbPembayaran;
use App\Models\PpdbPendaftar;
use App\Models\PpdbPeriode;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PpdbController extends Controller
{
    private const SETTING_KEY = 'ppdb_dibuka';

    /**
     * Status buka/tutup + info pelengkap (jadwal, syarat, biaya) — publik,
     * dipakai halaman landing PPDB & halaman formulir. Info pelengkap
     * sengaja teks bebas (bukan field terstruktur) supaya Waka Humas bisa
     * tulis apa saja tanpa perlu perubahan kode tiap tahun ajaran.
     */
    public function pengaturan()
    {
        $templatePernyataan = Setting::get('ppdb_template_pernyataan', '');
        $brosurDepan = Setting::get('ppdb_brosur_depan', '');
        $brosurBelakang = Setting::get('ppdb_brosur_belakang', '');

        return response()->json([
            'dibuka' => Setting::get(self::SETTING_KEY, '1') === '1',
            'jadwal_pendaftaran' => Setting::get('ppdb_jadwal', ''),
            'syarat_pendaftaran' => Setting::get('ppdb_syarat', ''),
            'biaya_pendaftaran' => Setting::get('ppdb_biaya', ''),
            'info_tambahan' => Setting::get('ppdb_info_tambahan', ''),
            'template_pernyataan_url' => $templatePernyataan ? '/storage/' . $templatePernyataan : null,
            'brosur_depan_url' => $brosurDepan ? '/storage/' . $brosurDepan : null,
            'brosur_belakang_url' => $brosurBelakang ? '/storage/' . $brosurBelakang : null,
            // Dipakai halaman landing publik buat label "Penerimaan Peserta
            // Didik Baru {periode}" — SENGAJA nama periode PPDB, bukan
            // profile.tahun_ajaran (tahun ajaran sekolah), karena PPDB
            // sengaja dilepas dari tahun ajaran (lihat PpdbPeriode).
            'periode_aktif' => PpdbPeriode::where('status', 'aktif')->value('nama'),
        ]);
    }

    /**
     * Waka Humas menyalakan/mematikan pendaftaran online & mengisi info
     * pelengkap — dipisah dari SettingController (yang isinya jam masuk,
     * punya Waka Kesiswaan) supaya tiap Waka cuma punya endpoint
     * pengaturan di domainnya sendiri.
     */
    public function updatePengaturan(Request $request)
    {
        $data = $request->validate([
            'dibuka' => 'required|boolean',
            'jadwal_pendaftaran' => 'nullable|string|max:2000',
            'syarat_pendaftaran' => 'nullable|string|max:3000',
            'biaya_pendaftaran' => 'nullable|string|max:2000',
            'info_tambahan' => 'nullable|string|max:3000',
        ]);

        Setting::set(self::SETTING_KEY, $data['dibuka'] ? '1' : '0');
        Setting::set('ppdb_jadwal', $data['jadwal_pendaftaran'] ?? '');
        Setting::set('ppdb_syarat', $data['syarat_pendaftaran'] ?? '');
        Setting::set('ppdb_biaya', $data['biaya_pendaftaran'] ?? '');
        Setting::set('ppdb_info_tambahan', $data['info_tambahan'] ?? '');

        return response()->json([
            'message' => $data['dibuka'] ? 'Pendaftaran online PPDB dibuka.' : 'Pendaftaran online PPDB ditutup.',
            'dibuka' => $data['dibuka'],
        ]);
    }

    /**
     * Upload/ganti template Surat Pernyataan (Fakta Integritas) kosong —
     * diunduh calon siswa lewat halaman formulir, diisi manual, lalu
     * diunggah BALIK sebagai berkas_pernyataan lewat daftar() di atas.
     * File lama (kalau ada) dihapus supaya storage tidak menumpuk versi usang.
     */
    public function uploadTemplatePernyataan(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:pdf|max:2048']);

        $lama = Setting::get('ppdb_template_pernyataan', '');
        if ($lama) {
            Storage::disk('public')->delete($lama);
        }

        $path = $request->file('file')->store('ppdb-template', 'public');
        Setting::set('ppdb_template_pernyataan', $path);

        return response()->json([
            'message' => 'Template Surat Pernyataan berhasil diunggah.',
            'template_pernyataan_url' => '/storage/' . $path,
        ]);
    }

    /**
     * Upload/ganti gambar brosur PPDB (halaman depan/belakang) — ditampilkan
     * di halaman landing publik /ppdb di bawah info Biaya Pendaftaran. Pola
     * sama seperti uploadTemplatePernyataan(): file lama (kalau ada) dihapus
     * dulu supaya storage tidak menumpuk versi usang.
     */
    public function uploadBrosur(Request $request)
    {
        $data = $request->validate([
            'sisi' => 'required|in:depan,belakang',
            'file' => 'required|file|mimes:jpg,jpeg,png|max:5120',
        ]);

        $key = 'ppdb_brosur_' . $data['sisi'];
        $lama = Setting::get($key, '');
        if ($lama) {
            Storage::disk('public')->delete($lama);
        }

        $path = $request->file('file')->store('ppdb-brosur', 'public');
        Setting::set($key, $path);

        return response()->json([
            'message' => 'Brosur halaman ' . $data['sisi'] . ' berhasil diunggah.',
            'brosur_depan_url' => ($p = Setting::get('ppdb_brosur_depan', '')) ? '/storage/' . $p : null,
            'brosur_belakang_url' => ($p = Setting::get('ppdb_brosur_belakang', '')) ? '/storage/' . $p : null,
        ]);
    }

    /**
     * Daftar jurusan (kode+nama) — publik, dipakai halaman landing PPDB
     * (pilihan jurusan) SEBELUM calon siswa punya akun. Endpoint /jurusan
     * yang dipakai menu login (Master Data, dst) ada di balik auth:sanctum,
     * jadi tidak bisa dipanggil dari halaman publik ini — sengaja dibuatkan
     * endpoint terpisah alih-alih mendaftarkan ulang /jurusan tanpa auth
     * (2 registrasi URI+method yang sama bikin Laravel cuma pakai yang
     * TERAKHIR didaftarkan, diam-diam menghapus proteksi auth yang lama).
     */
    public function jurusanList()
    {
        return Jurusan::select('id', 'kode', 'nama')->orderBy('nama')->get();
    }

    /**
     * Aturan validasi formulir PPDB lengkap (section A-G) — dipakai BERSAMA
     * oleh daftar() (publik) dan storeManual() (admin input offline) supaya
     * field-nya SELALU sama persis, tidak bisa diam-diam beda struktur
     * antara 2 jalur yang mengisi tabel ppdb_pendaftars yang sama. Yang
     * beda cuma tingkat kewajibannya lewat $mode:
     * - 'online' (formulir publik): SEMUA field wajib diisi (lihat
     *   PpdbPendaftar::FIELD_WAJIB_ONLINE), kecuali Data Wali, Berkebutuhan
     *   Khusus, No. Registrasi Akta Lahir & Tanggal/No. STK, plus
     *   Pas Foto wajib diunggah. Berkas PDF selain Pas Foto tetap opsional
     *   (dilacak terpisah lewat kolom "Kelengkapan Berkas" di admin).
     * - 'offline' (admin input manual): cuma Nama Lengkap, Jurusan
     *   Diminati & Jenis Kelamin yang wajib — sisanya boleh menyusul,
     *   termasuk Pas Foto. Jenis Kelamin wajib di KEDUA mode karena
     *   dipakai nentuin nominal biaya pendaftaran (beda laki-laki/
     *   perempuan per periode PPDB, lihat PpdbPendaftar::getTargetBiayaAttribute()).
     */
    private function aturanValidasiPpdb(string $mode): array
    {
        $wajibOnline = $mode === 'online' ? 'required' : 'nullable';

        $aturan = [
            // A. Keterangan Pribadi
            'nama_lengkap' => 'required|string|max:150',
            'nik' => "{$wajibOnline}|string|max:20",
            'nisn' => ($mode === 'online' ? 'required' : 'nullable') . '|regex:/^[0-9]{5,20}$/',
            'jenis_kelamin' => 'required|in:L,P',
            'tempat_lahir' => "{$wajibOnline}|string|max:100",
            'tanggal_lahir' => "{$wajibOnline}|date|before:today",
            'no_registrasi_akta_lahir' => 'nullable|string|max:100',
            'agama' => "{$wajibOnline}|string|max:30",
            'kewarganegaraan' => "{$wajibOnline}|string|max:50",
            'berkebutuhan_khusus' => 'nullable|string|max:100',
            'alamat' => "{$wajibOnline}|string|max:500",
            'tempat_tinggal' => "{$wajibOnline}|string|max:100",
            'anak_ke' => "{$wajibOnline}|integer|min:1|max:30",
            'jumlah_saudara' => "{$wajibOnline}|integer|min:0|max:30",
            'no_hp_siswa' => [$wajibOnline, 'string', 'regex:/^[0-9+\-\s]{8,20}$/'],
            // B. Pendidikan
            'asal_sekolah' => "{$wajibOnline}|string|max:150",
            'ijazah_terakhir' => "{$wajibOnline}|string|max:100",
            'tanggal_no_stk' => 'nullable|string|max:100',
            // C/D. Data Ayah & Ibu Kandung
            'nama_ayah' => "{$wajibOnline}|string|max:150",
            'pekerjaan_ayah' => "{$wajibOnline}|string|max:100",
            'penghasilan_ayah' => "{$wajibOnline}|string|max:100",
            'alamat_ayah' => "{$wajibOnline}|string|max:300",
            'no_hp_ayah' => "{$wajibOnline}|string|max:30",
            'nama_ibu' => "{$wajibOnline}|string|max:150",
            'pekerjaan_ibu' => "{$wajibOnline}|string|max:100",
            'penghasilan_ibu' => "{$wajibOnline}|string|max:100",
            'alamat_ibu' => "{$wajibOnline}|string|max:300",
            'no_hp_ibu' => "{$wajibOnline}|string|max:30",
            // E. Data Wali — inheren opsional (tidak semua siswa punya wali)
            'nama_wali' => 'nullable|string|max:150',
            'alamat_wali' => 'nullable|string|max:300',
            // F. Data Periodik Siswa
            'jurusan_pilihan' => 'required|string|max:100',
            'tinggi_badan' => "{$wajibOnline}|integer|min:50|max:250",
            'jarak_rumah_sekolah' => "{$wajibOnline}|string|max:100",
            'berat_badan' => "{$wajibOnline}|integer|min:10|max:300",
            'ukuran_baju' => "{$wajibOnline}|string|max:20",
            'hobi' => "{$wajibOnline}|string|max:100",
            // G. Berkas persyaratan — semua dokumen WAJIB PDF (bukan foto
            // jepretan HP), kecuali Pas Foto yang memang harus JPG asli
            // (bukan scan). Kelengkapannya dilacak terpisah lewat kolom
            // "Kelengkapan Berkas" di tabel admin, jadi sengaja TIDAK
            // dipaksa wajib di sini walau mode online — sekolah tetap bisa
            // terima berkas susulan fisik.
            'berkas_pas_foto' => ($mode === 'online' ? 'required' : 'nullable') . '|file|mimes:jpg,jpeg|max:2048',
            'berkas_formulir_pendaftaran' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_ijazah' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_skhu' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_rapot' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_skkb' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_pernyataan' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_akta_lahir' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_kk' => 'nullable|file|mimes:pdf|max:2048',
            'berkas_kip' => 'nullable|file|mimes:pdf|max:2048',
        ];

        return $aturan;
    }

    /**
     * Sengaja diisi generik dari ayah (kalau ada) supaya kolom lama
     * (dipakai tabel admin & alur "Jadikan Siswa") tetap terisi tanpa
     * perlu diketik dobel di formulir. Lalu simpan tiap berkas yang
     * diunggah ke disk & timpa path-nya ke $data.
     */
    private function lengkapiDataOrtuDanBerkas(Request $request, array $data): array
    {
        $data['nama_orang_tua'] = $data['nama_ayah'] ?? $data['nama_ibu'] ?? null;
        $data['no_hp_orang_tua'] = $data['no_hp_ayah'] ?? $data['no_hp_ibu'] ?? $data['no_hp_siswa'] ?? '-';

        foreach (['ijazah', 'skhu', 'rapot', 'skkb', 'pas_foto', 'formulir_pendaftaran', 'pernyataan', 'akta_lahir', 'kk', 'kip'] as $field) {
            if ($request->hasFile("berkas_{$field}")) {
                $data["berkas_{$field}"] = $request->file("berkas_{$field}")->store('ppdb-berkas', 'public');
            }
        }

        return $data;
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

        $data = $request->validate($this->aturanValidasiPpdb('online'));
        $data = $this->lengkapiDataOrtuDanBerkas($request, $data);

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
     * Ambil biodata & berkas lengkap pakai kode pendaftaran — dipakai
     * calon siswa sendiri (belum punya akun) untuk membuka form "Edit
     * Data / Berkas" di halaman /ppdb/daftar dan melengkapi/membetulkan
     * data yang sudah dikirim. Kode pendaftaran berfungsi sebagai kunci
     * akses (pola sama seperti status() di atas), jadi sengaja publik
     * tanpa auth:sanctum — sudah dibatasi throttle:ppdb-status di rute.
     */
    public function editByKode($kode)
    {
        $pendaftar = PpdbPendaftar::where('kode_pendaftaran', $kode)->first();

        if (!$pendaftar) {
            return response()->json(['message' => 'Kode pendaftaran tidak ditemukan.'], 404);
        }

        return response()->json($pendaftar);
    }

    /**
     * Simpan perubahan biodata/berkas lewat kode pendaftaran (jalur
     * publik, tanpa auth). Aturan validasinya SENGAJA dipakai mode
     * 'offline' (cuma Nama Lengkap & Jurusan Diminati wajib) — calon
     * siswa cuma MELENGKAPI/MEMBETULKAN data yang sudah ada, bukan
     * mengisi formulir dari nol, jadi tidak masuk akal memaksa semua
     * field terisi ulang. Status & catatan TIDAK termasuk aturan ini
     * (tetap cuma admin lewat update() yang bisa mengubahnya).
     */
    public function updateByKode(Request $request, $kode)
    {
        $pendaftar = PpdbPendaftar::where('kode_pendaftaran', $kode)->first();

        if (!$pendaftar) {
            return response()->json(['message' => 'Kode pendaftaran tidak ditemukan.'], 404);
        }

        $data = $request->validate($this->aturanValidasiPpdb('offline'));
        $data = $this->lengkapiDataOrtuDanBerkas($request, $data);

        $pendaftar->update($data);

        return response()->json([
            'message' => 'Data pendaftaran berhasil diperbarui.',
            'pendaftar' => $pendaftar->fresh(),
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
        $aturan = $this->aturanValidasiPpdb('offline');
        $aturan['status'] = 'nullable|in:mendaftar,verifikasi,diterima,ditolak';
        $aturan['catatan'] = 'nullable|string';

        $data = $request->validate($aturan);
        $data = $this->lengkapiDataOrtuDanBerkas($request, $data);

        $data['kode_pendaftaran'] = PpdbPendaftar::buatKodePendaftaran();
        $data['status'] = $data['status'] ?? 'mendaftar';

        $pendaftar = PpdbPendaftar::create($data);

        return response()->json($pendaftar, 201);
    }

    public function index(Request $request)
    {
        // withSum nempel kolom "total_dibayar" (jumlah nominal semua
        // cicilan) ke tiap baris tanpa query terpisah per pendaftar —
        // dipakai tabel admin buat status Lunas/Dicicil/Belum Bayar.
        // with('ppdbPeriode') supaya accessor target_biaya (dipakai attribute
        // yang sama) tidak lazy-load 1 query per baris (N+1).
        $query = PpdbPendaftar::withSum(['pembayarans as total_dibayar'], 'nominal')
            ->with('ppdbPeriode')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('ppdb_periode_id')) {
            $query->where('ppdb_periode_id', $request->ppdb_periode_id);
        }

        return $query->get();
    }

    /**
     * Edit data pendaftar PPDB yang sudah tersimpan (baik yang masuk lewat
     * daftar() publik maupun storeManual() admin) — dipakai admin buat
     * membetulkan/melengkapi biodata setelahnya. Aturan validasinya SAMA
     * dengan storeManual() (mode 'offline': cuma Nama Lengkap & Jurusan
     * Diminati wajib) supaya admin tetap bisa simpan walau datanya belum
     * lengkap. Kode pendaftaran tidak diubah. Berkas baru (kalau diunggah)
     * menimpa path lama di kolom — file lama tidak dihapus dari storage,
     * pola yang sama seperti upload berkas lain di controller ini.
     */
    public function updateManual(Request $request, PpdbPendaftar $ppdbPendaftar)
    {
        $aturan = $this->aturanValidasiPpdb('offline');
        $aturan['status'] = 'nullable|in:mendaftar,verifikasi,diterima,ditolak';
        $aturan['catatan'] = 'nullable|string';

        $data = $request->validate($aturan);
        $data = $this->lengkapiDataOrtuDanBerkas($request, $data);

        $ppdbPendaftar->update($data);

        return $ppdbPendaftar->fresh();
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

    /**
     * Riwayat cicilan pembayaran biaya pendaftaran 1 pendaftar — sekolah
     * terima tunai/transfer manual (bukan payment gateway), jadi admin
     * yang input nominalnya sendiri tiap kali terima pembayaran, boleh
     * bertahap (dicicil) berkali-kali.
     */
    public function pembayaranList(PpdbPendaftar $ppdbPendaftar)
    {
        return $ppdbPendaftar->pembayarans()->with('dicatatOleh:id,name')->get();
    }

    public function storePembayaran(Request $request, PpdbPendaftar $ppdbPendaftar)
    {
        $data = $request->validate([
            'nominal' => 'required|integer|min:1',
            'metode' => 'required|in:tunai,transfer',
            'tanggal_bayar' => 'nullable|date',
            'catatan' => 'nullable|string|max:255',
        ]);

        // Cegah admin salah ketik nominal lebih besar dari sisa tagihan —
        // target 0 (periode belum diatur nominalnya) dianggap tanpa batas.
        // target_biaya = accessor di model, sumbernya nominal periode PPDB
        // pendaftar ini (lihat PpdbPendaftar::getTargetBiayaAttribute()).
        $target = $ppdbPendaftar->target_biaya;
        if ($target > 0) {
            $sudahDibayar = (int) $ppdbPendaftar->pembayarans()->sum('nominal');
            $sisa = $target - $sudahDibayar;

            if ($sisa <= 0) {
                return response()->json(['message' => 'Pembayaran untuk pendaftar ini sudah lunas.'], 422);
            }
            if ($data['nominal'] > $sisa) {
                return response()->json([
                    'message' => 'Nominal melebihi sisa tagihan (Rp' . number_format($sisa, 0, ',', '.') . ').',
                ], 422);
            }
        }

        $data['tanggal_bayar'] = $data['tanggal_bayar'] ?? now()->toDateString();
        $data['dicatat_oleh_id'] = $request->user()->id;

        $ppdbPendaftar->pembayarans()->create($data);

        return response()->json(
            $ppdbPendaftar->fresh()->loadSum(['pembayarans as total_dibayar'], 'nominal'),
            201
        );
    }

    public function destroyPembayaran(PpdbPembayaran $pembayaran)
    {
        $pendaftar = $pembayaran->pendaftar;
        $pembayaran->delete();

        return response()->json(
            $pendaftar->fresh()->loadSum(['pembayarans as total_dibayar'], 'nominal')
        );
    }

    /**
     * "Hapus Lunas" — hapus SEMUA cicilan tercatat buat 1 pendaftar
     * sekaligus (bukan cuma 1 baris seperti destroyPembayaran()), dipakai
     * kalau admin salah tandai lunas / mau reset pembayarannya dari nol.
     */
    public function clearPembayaran(PpdbPendaftar $ppdbPendaftar)
    {
        $ppdbPendaftar->pembayarans()->delete();

        return response()->json(
            $ppdbPendaftar->fresh()->loadSum(['pembayarans as total_dibayar'], 'nominal')
        );
    }

    /**
     * Kartu ringkasan menu "Keuangan PPDB" — total uang masuk & sebaran
     * status Lunas/Dicicil/Belum Bayar, difilter per periode PPDB (default
     * periode yang sedang aktif kalau tidak dipilih eksplisit).
     */
    public function keuanganRingkasan(Request $request)
    {
        $periodeId = $request->filled('ppdb_periode_id') ? $request->ppdb_periode_id : PpdbPeriode::aktifId();

        $query = PpdbPendaftar::withSum(['pembayarans as total_dibayar'], 'nominal')->with('ppdbPeriode');
        if ($periodeId) {
            $query->where('ppdb_periode_id', $periodeId);
        }
        $pendaftars = $query->get();

        $lunas = $dicicil = $belumBayar = $tanpaTarget = 0;
        foreach ($pendaftars as $p) {
            $target = $p->target_biaya;
            $dibayar = (int) ($p->total_dibayar ?? 0);
            if ($target <= 0) {
                $tanpaTarget++;
                continue;
            }
            if ($dibayar <= 0) {
                $belumBayar++;
            } elseif ($dibayar < $target) {
                $dicicil++;
            } else {
                $lunas++;
            }
        }

        return response()->json([
            'ppdb_periode_id' => $periodeId,
            'total_pemasukan' => (int) $pendaftars->sum('total_dibayar'),
            'jumlah_pendaftar' => $pendaftars->count(),
            'lunas' => $lunas,
            'dicicil' => $dicicil,
            'belum_bayar' => $belumBayar,
            'tanpa_target' => $tanpaTarget,
        ]);
    }

    /**
     * Buku kas menu "Keuangan PPDB" — daftar SEMUA transaksi pembayaran
     * (bukan per pendaftar seperti pembayaranList()), difilter per periode
     * PPDB lewat relasi pendaftar-nya.
     */
    public function keuanganTransaksi(Request $request)
    {
        $periodeId = $request->filled('ppdb_periode_id') ? $request->ppdb_periode_id : PpdbPeriode::aktifId();

        // ppdb_periode_id WAJIB ikut di-select walau tidak dipakai langsung
        // di frontend — tanpa itu accessor target_biaya/ppdbPeriode milik
        // PpdbPendaftar (appended otomatis ke tiap JSON, lihat $appends)
        // diam-diam salah hitung (jatuh ke fallback 0) karena relasinya
        // tidak bisa di-resolve dari kolom yang di-select.
        $query = PpdbPembayaran::with(['pendaftar:id,nama_lengkap,kode_pendaftaran,jenis_kelamin,ppdb_periode_id', 'dicatatOleh:id,name'])
            ->orderByDesc('tanggal_bayar')
            ->orderByDesc('id');

        if ($periodeId) {
            $query->whereHas('pendaftar', fn ($q) => $q->where('ppdb_periode_id', $periodeId));
        }

        return $query->get();
    }

    /**
     * Tarik 1 pendaftar yang sudah "diterima" jadi siswa aktif resmi —
     * bikin akun User + Student sekaligus, supaya biodata yang sudah diisi
     * calon siswa lewat formulir PPDB tidak perlu diketik ulang manual di
     * Master Data > Siswa. Field yang PPDB tidak punya (NIS, kelas) wajib
     * diisi admin di sini; jurusan opsional (kalau tidak diisi eksplisit,
     * dicoba dicocokkan otomatis dari jurusan_pilihan — pola sama seperti
     * AlumniImport::model()). Password akun dibuat default (123456), sama
     * seperti alur tambah siswa lain.
     */
    public function jadikanSiswa(Request $request, PpdbPendaftar $ppdbPendaftar)
    {
        abort_unless($ppdbPendaftar->status === 'diterima', 422, 'Cuma pendaftar berstatus "Diterima" yang bisa dijadikan siswa.');
        abort_if($ppdbPendaftar->student_id, 422, 'Pendaftar ini sudah pernah dijadikan siswa sebelumnya.');

        $data = $request->validate([
            'nis' => 'required|string|unique:students,nis',
            'email' => 'nullable|email|unique:users,email',
            'class_room_id' => 'required|exists:class_rooms,id',
            'jurusan_id' => 'nullable|exists:jurusans,id',
        ]);

        $jurusanId = $data['jurusan_id'] ?? null;
        if (!$jurusanId && $ppdbPendaftar->jurusan_pilihan) {
            $pilihan = trim($ppdbPendaftar->jurusan_pilihan);
            $jurusanId = Jurusan::where('kode', $pilihan)->orWhere('nama', $pilihan)->first()?->id;
        }

        $student = DB::transaction(function () use ($data, $jurusanId, $ppdbPendaftar) {
            $user = User::create([
                'name' => $ppdbPendaftar->nama_lengkap,
                'email' => $data['email'] ?? null,
                'password' => bcrypt('123456'),
                'role' => 'siswa',
            ]);

            $student = Student::create([
                'user_id' => $user->id,
                'class_room_id' => $data['class_room_id'],
                'jurusan_id' => $jurusanId,
                'nis' => $data['nis'],
                'nisn' => $ppdbPendaftar->nisn,
                'jenis_kelamin' => $ppdbPendaftar->jenis_kelamin,
                'tempat_lahir' => $ppdbPendaftar->tempat_lahir,
                'tanggal_lahir' => $ppdbPendaftar->tanggal_lahir,
                'alamat' => $ppdbPendaftar->alamat,
                'sekolah_asal_nama' => $ppdbPendaftar->asal_sekolah,
                'nama_ayah' => $ppdbPendaftar->nama_orang_tua,
                'telp_ortu' => $ppdbPendaftar->no_hp_orang_tua,
                'status' => 'aktif',
                'qr_code' => 'STD-' . strtoupper(Str::random(8)),
            ]);

            $ppdbPendaftar->update(['student_id' => $student->id]);

            return $student;
        });

        return $student->load(['user', 'classRoom', 'jurusan']);
    }
}
