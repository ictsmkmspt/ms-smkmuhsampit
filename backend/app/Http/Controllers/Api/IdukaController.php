<?php

namespace App\Http\Controllers\Api;

use App\Exports\IdukaTemplateExport;
use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Imports\IdukaImport;
use App\Models\Iduka;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;

/**
 * IDUKA (Industri, Dunia Usaha, dan Dunia Kerja) sekarang murni DATA MASTER
 * perusahaan mitra + lokasi/radius GPS — TIDAK terikat langsung ke akun
 * login manapun. Akun Instruktur (untuk PKL) MEMILIH salah satu baris di
 * sini lewat users.iduka_id, bukan membuat baris perusahaan sendiri-sendiri
 * — supaya 1 perusahaan bisa diwakili lebih dari 1 akun Instruktur
 * sekaligus. Lihat method *Instruktur() di bawah untuk kelola akunnya.
 *
 * Fitur BKK (pasang lowongan kerja) belum dibangun — sengaja TIDAK ada
 * akun/role terpisah untuk itu (pernah dicoba, lalu dihapus lagi supaya
 * mitra tidak perlu daftar akun 2x): begitu BKK dikerjakan, akun Instruktur
 * yang sudah ada tinggal dipakai login untuk fitur itu juga.
 */
class IdukaController extends Controller
{
    use ResetsPasswordToDefault;

    /**
     * Daftar semua perusahaan mitra (data master) — dipakai admin kelola
     * daftar, dropdown pilih perusahaan saat membuat akun Instruktur/IDUKA,
     * dan dropdown Penempatan PKL.
     */
    public function index()
    {
        return Iduka::orderBy('nama_perusahaan')->get();
    }

    /**
     * Daftarkan perusahaan mitra baru (data master + lokasi/radius GPS untuk
     * geofencing absensi PKL). TIDAK membuat akun login apa pun di sini —
     * akun Instruktur/IDUKA dibuat terpisah lewat *Instruktur()/*Bkk()
     * setelah perusahaannya ada.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'radius_meter'     => 'required|integer|min:10|max:5000',
        ]);

        return response()->json(Iduka::create($data), 201);
    }

    public function update(Request $request, Iduka $iduka)
    {
        $data = $request->validate([
            'nama_perusahaan'  => 'sometimes|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'sometimes|numeric|between:-90,90',
            'longitude'        => 'sometimes|numeric|between:-180,180',
            'radius_meter'     => 'sometimes|integer|min:10|max:5000',
        ]);

        $iduka->update($data);

        return $iduka->fresh();
    }

    /**
     * Hapus perusahaan mitra. Akun Instruktur/IDUKA yang tadinya mewakilinya
     * TIDAK ikut terhapus — cuma tertinggal tanpa perusahaan (iduka_id jadi
     * null, lihat nullOnDelete di migrasi), supaya tidak kehilangan akses
     * login cuma karena data perusahaannya dihapus admin.
     */
    public function destroy(Iduka $iduka)
    {
        $iduka->delete();
        return response()->json(['message' => 'Data perusahaan mitra dihapus.']);
    }

    /**
     * Profil perusahaan mitra milik akun yang sedang login (Instruktur atau
     * IDUKA) — dipakai halaman dashboard masing-masing.
     */
    public function myProfile(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke perusahaan mitra manapun.'], 404);
        }
        return $iduka;
    }

    /**
     * Akun yang sedang login (Instruktur/IDUKA) mengubah identitas login-nya
     * sendiri (nama & no HP) — dipakai menu "Edit Profil". Data perusahaan
     * (nama, alamat, GPS) sengaja TIDAK bisa diubah dari sini lagi — itu
     * data resmi bersama yang dipakai lebih dari 1 akun sekaligus, tetap
     * dikelola admin lewat Master Data > Kelola IDUKA.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'telepon' => ['required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
        ]);

        $user->update(['name' => $data['name'], 'phone' => $data['telepon']]);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Unggah/ganti gambar tanda tangan perusahaan mitra milik akun yang
     * sedang login. Gambar ini dipakai menggantikan tanda centang (✓) di
     * kolom paraf pada halaman cetak jurnal, begitu Instruktur/IDUKA
     * memverifikasi absensi/catatan bimbingan. Tersimpan di data perusahaan
     * (bukan per akun) — kalau perusahaan diwakili lebih dari 1 akun,
     * tanda tangannya dipakai bersama.
     */
    public function uploadTandaTangan(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke perusahaan mitra manapun.'], 404);
        }

        $request->validate([
            'tanda_tangan' => 'required|image|max:2048',
        ]);

        if ($iduka->tanda_tangan) {
            Storage::disk('public')->delete($iduka->tanda_tangan);
        }

        $path = $request->file('tanda_tangan')->store('tanda-tangan', 'public');
        $iduka->update(['tanda_tangan' => $path]);

        return response()->json([
            'message' => 'Tanda tangan berhasil disimpan.',
            'iduka'   => $iduka->fresh(),
        ]);
    }

    /**
     * Download file Excel (.xlsx) kosong berisi contoh format kolom untuk import
     * akun Instruktur sekaligus perusahaan mitranya. Isi datanya, lalu upload
     * lewat fitur Import.
     */
    public function downloadTemplate()
    {
        return Excel::download(new IdukaTemplateExport, 'template_import_iduka.xlsx');
    }

    /**
     * Import banyak perusahaan mitra + akun Instruktur-nya sekaligus dari
     * file Excel (.xlsx) yang diupload. Tiap baris bikin 1 perusahaan BARU
     * (bukan pilih dari yang sudah ada — beda dari storeInstruktur() manual)
     * supaya proses import tetap sesederhana 1 file = banyak pasangan
     * perusahaan+instruktur baru. Baris yang gagal tidak menghentikan
     * proses, cukup dilaporkan di akhir.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $import = new IdukaImport;
        Excel::import($import, $request->file('file'));

        $gagal = [];
        foreach ($import->failures() as $failure) {
            $gagal[] = [
                'baris'  => $failure->row(),
                'kolom'  => $failure->attribute(),
                'alasan' => implode(' ', $failure->errors()),
            ];
        }

        return response()->json([
            'message'  => $import->successCount . ' Instruktur berhasil diimport, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal'    => $gagal,
        ]);
    }

    /**
     * Daftar akun Instruktur (dipakai admin kelola daftar). List-nya
     * User-sentris (bukan Iduka lagi) karena sekarang 1 perusahaan bisa
     * punya lebih dari 1 akun Instruktur.
     */
    public function indexInstruktur()
    {
        return User::with('iduka')->where('role', 'instruktur')->orderBy('name')->get();
    }

    /**
     * Buat akun Instruktur baru — MEMILIH perusahaan mitra yang sudah ada
     * (iduka_id) lewat dropdown, bukan mengisi ulang data perusahaan +
     * GPS dari nol. Email opsional — disiapkan supaya akun ini nanti bisa
     * dipakai login ke dashboard BKK juga (AuthController::login() sudah
     * menerima email ATAU no HP secara generik, tidak perlu ubah apa pun
     * di sana untuk ini).
     */
    public function storeInstruktur(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'telepon'  => 'required|string|max:30|unique:users,phone',
            'email'    => 'nullable|email|max:150|unique:users,email',
            'password' => 'nullable|min:6',
            'iduka_id' => 'required|exists:idukas,id',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'phone'    => $data['telepon'],
            'email'    => $data['email'] ?? null,
            'password' => bcrypt($data['password'] ?? '123456'),
            'role'     => 'instruktur',
            'iduka_id' => $data['iduka_id'],
        ]);

        return response()->json($user->load('iduka'), 201);
    }

    public function updateInstruktur(Request $request, User $instruktur)
    {
        abort_unless($instruktur->role === 'instruktur', 404);

        $data = $request->validate([
            'name'     => 'sometimes|string|max:100',
            'telepon'  => ['sometimes', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($instruktur->id)],
            'email'    => ['nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($instruktur->id)],
            'iduka_id' => 'sometimes|exists:idukas,id',
        ]);

        if (isset($data['telepon'])) {
            $data['phone'] = $data['telepon'];
            unset($data['telepon']);
        }

        $instruktur->update($data);

        return $instruktur->fresh()->load('iduka');
    }

    public function destroyInstruktur(User $instruktur)
    {
        abort_unless($instruktur->role === 'instruktur', 404);
        $instruktur->delete();
        return response()->json(['message' => 'Akun Instruktur dihapus.']);
    }

    public function resetPasswordInstruktur(User $instruktur)
    {
        abort_unless($instruktur->role === 'instruktur', 404);
        $this->resetToDefaultPassword($instruktur);
        return response()->json(['message' => 'Password akun Instruktur "' . $instruktur->name . '" berhasil direset ke default (123456).']);
    }

    // Akun IDUKA (BKK) terpisah SEMPAT dibuat di sini (indexBkk/storeBkk/dst)
    // lalu dihapus lagi — supaya tidak ribet daftar 2x, akun Instruktur yang
    // sudah ada nanti langsung dipakai login ke fitur BKK juga begitu
    // dibangun, bukan bikin akun baru role 'iduka' terpisah.
}
