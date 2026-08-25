<?php

namespace App\Http\Controllers\Api;

use App\Exports\IdukaTemplateExport;
use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Imports\IdukaImport;
use App\Models\Iduka;
use App\Models\User;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;

/**
 * IDUKA (Industri, Dunia Usaha, dan Dunia Kerja) = data master perusahaan
 * mitra + lokasi/radius GPS. Setiap baris di sini SEKALIGUS jadi 1 akun
 * login sendiri (role 'iduka', login pakai email — WAJIB diisi) — dibuat/
 * diedit LANGSUNG lewat form Kelola IDUKA yang sama (bukan menu/tabel
 * terpisah), jadi maksimal 1 akun per perusahaan, lihat idukas.user_id.
 * Password SELALU dibuat otomatis "123456" (tidak ada input password di
 * form), diganti lewat resetPasswordAkun().
 *
 * Ini BEDA dari akun Instruktur (untuk PKL) — itu akunnya sendiri-sendiri
 * per orang, MEMILIH salah satu baris IDUKA lewat users.iduka_id, dan 1
 * perusahaan bisa diwakili lebih dari 1 akun Instruktur sekaligus. Lihat
 * method *Instruktur() di bawah untuk kelola akun itu.
 */
class IdukaController extends Controller
{
    use ResetsPasswordToDefault;

    /**
     * Daftar semua perusahaan mitra (data master) — dipakai admin kelola
     * daftar, dropdown pilih perusahaan saat membuat akun Instruktur, dan
     * dropdown Penempatan PKL.
     */
    public function index()
    {
        return Iduka::with('user')->orderBy('nama_perusahaan')->get();
    }

    /**
     * Daftarkan perusahaan mitra baru (data master + lokasi/radius GPS untuk
     * geofencing absensi PKL). Email WAJIB diisi — sekaligus bikin akun
     * login (role 'iduka') untuk perusahaan ini, password otomatis "123456"
     * (tidak ada input password, wajib diganti saat login pertama).
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
            'email'            => 'required|email|max:150|unique:users,email',
        ]);

        $iduka = Iduka::create(collect($data)->except(['email'])->toArray());

        $akun = User::create([
            'name'     => $data['nama_perusahaan'],
            'email'    => $data['email'],
            'password' => bcrypt('123456'),
            'role'     => 'iduka',
            'iduka_id' => $iduka->id,
        ]);
        $iduka->forceFill(['user_id' => $akun->id])->save();

        return response()->json($iduka->fresh()->load('user'), 201);
    }

    /**
     * Email WAJIB diisi (sama seperti store). Kalau baris IDUKA ini belum
     * punya akun (data lama dari sebelum email diwajibkan), akun baru
     * otomatis dibuat di sini dengan password default "123456".
     */
    public function update(Request $request, Iduka $iduka)
    {
        $data = $request->validate([
            'nama_perusahaan'  => 'sometimes|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'telepon'          => 'nullable|string|max:30',
            'latitude'         => 'sometimes|numeric|between:-90,90',
            'longitude'        => 'sometimes|numeric|between:-180,180',
            'radius_meter'     => 'sometimes|integer|min:10|max:5000',
            'email'            => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($iduka->user_id)],
        ]);

        $iduka->update(collect($data)->except(['email'])->toArray());

        if ($iduka->user) {
            $iduka->user->update(['email' => $data['email']]);
        } else {
            $akun = User::create([
                'name'     => $iduka->nama_perusahaan,
                'email'    => $data['email'],
                'password' => bcrypt('123456'),
                'role'     => 'iduka',
                'iduka_id' => $iduka->id,
            ]);
            $iduka->forceFill(['user_id' => $akun->id])->save();
        }

        return $iduka->fresh()->load('user');
    }

    /**
     * Hapus perusahaan mitra. Akun login perusahaan ini sendiri
     * (idukas.user_id) IKUT terhapus — akun itu tidak berarti apa-apa tanpa
     * perusahaannya. Akun Instruktur yang tadinya mewakilinya TIDAK ikut
     * terhapus — cuma tertinggal tanpa perusahaan (iduka_id jadi null,
     * lihat nullOnDelete di migrasi), supaya tidak kehilangan akses login
     * cuma karena data perusahaannya dihapus admin.
     *
     * File di storage (tanda tangan, dokumen MOU, foto brosur tiap
     * lowongan) dibersihkan manual di sini SEBELUM baris dihapus — kalau
     * tidak, job_vacancies ikut terhapus otomatis lewat cascadeOnDelete DB
     * tanpa pernah lewat logika hapus-file di JobVacancyController, jadi
     * filenya tertinggal yatim piatu di storage selamanya.
     */
    public function destroy(Iduka $iduka)
    {
        if ($iduka->tanda_tangan) {
            Storage::disk('public')->delete($iduka->tanda_tangan);
        }
        if ($iduka->dokumen_mou) {
            Storage::disk('public')->delete($iduka->dokumen_mou);
        }
        foreach ($iduka->jobVacancies as $loker) {
            if ($loker->foto_brosur) {
                Storage::disk('public')->delete($loker->foto_brosur);
            }
        }

        $iduka->user?->delete();
        $iduka->delete();
        return response()->json(['message' => 'Data perusahaan mitra dihapus.']);
    }

    /**
     * Reset password akun login milik 1 perusahaan mitra ke default (123456).
     */
    public function resetPasswordAkun(Iduka $iduka)
    {
        abort_unless($iduka->user, 404, 'IDUKA ini belum punya akun login.');
        $this->resetToDefaultPassword($iduka->user);
        return response()->json(['message' => 'Password akun "' . $iduka->nama_perusahaan . '" berhasil direset ke default (123456).']);
    }

    /**
     * Pendaftaran mandiri IDUKA — publik, TIDAK butuh login. Beda dari
     * store() (admin): password dipilih sendiri oleh perusahaan (bukan
     * default "123456"), status awal "menunggu" (belum bisa login sampai
     * disetujui BKK/admin lewat setujui()). Lokasi GPS (latitude/longitude)
     * WAJIB diisi lewat peta di form pendaftaran — radius selalu 100 meter
     * (bisa disesuaikan admin/BKK belakangan lewat Kelola IDUKA kalau perlu).
     */
    public function registerPublic(Request $request)
    {
        $data = $request->validate([
            'nama_perusahaan' => 'required|string|max:150',
            'alamat'          => 'nullable|string|max:255',
            'telepon'         => 'nullable|string|max:30',
            'email'           => 'required|email|max:150|unique:users,email',
            'password'        => 'required|string|min:6|confirmed',
            'latitude'        => 'required|numeric|between:-90,90',
            'longitude'       => 'required|numeric|between:-180,180',
        ]);

        $iduka = Iduka::create([
            'nama_perusahaan' => $data['nama_perusahaan'],
            'alamat'          => $data['alamat'] ?? null,
            'telepon'         => $data['telepon'] ?? null,
            'latitude'        => $data['latitude'],
            'longitude'       => $data['longitude'],
            'radius_meter'    => 100,
            'status'          => 'menunggu',
        ]);

        $akun = User::create([
            'name'     => $data['nama_perusahaan'],
            'email'    => $data['email'],
            'password' => bcrypt($data['password']),
            'role'     => 'iduka',
            'iduka_id' => $iduka->id,
        ]);
        $iduka->forceFill(['user_id' => $akun->id])->save();

        NotificationDispatcher::sendMany(
            User::whereIn('role', ['admin', 'pengurus_bkk'])->get(),
            'lowongan',
            'Pendaftaran IDUKA baru',
            "{$data['nama_perusahaan']} mendaftar sebagai mitra, menunggu persetujuan.",
            '/bkk'
        );

        return response()->json([
            'message' => 'Pendaftaran berhasil. Akun Anda menunggu persetujuan tim BKK sebelum bisa masuk.',
        ], 201);
    }

    /**
     * Daftar IDUKA yang mendaftar mandiri dan belum diputuskan BKK/admin.
     */
    public function indexMenunggu()
    {
        return Iduka::where('status', 'menunggu')->latest()->get();
    }

    /**
     * Setujui pendaftaran mandiri IDUKA — status jadi "aktif", baru dari
     * titik ini akun perusahaan itu bisa login (lihat AuthController::login()).
     */
    public function setujui(Iduka $iduka)
    {
        abort_unless($iduka->status === 'menunggu', 422, 'Pendaftaran ini sudah diproses.');

        $iduka->update(['status' => 'aktif', 'catatan_verifikasi' => null]);

        if ($iduka->user) {
            NotificationDispatcher::send(
                $iduka->user,
                'lowongan',
                'Pendaftaran disetujui',
                'Akun IDUKA Anda sudah disetujui BKK, silakan masuk.',
                '/bursakerjakhusus/masuk'
            );
        }

        return $iduka->fresh();
    }

    /**
     * Tolak pendaftaran mandiri IDUKA — status jadi "ditolak" dengan
     * catatan alasan, akun tetap tidak bisa login.
     */
    public function tolak(Request $request, Iduka $iduka)
    {
        abort_unless($iduka->status === 'menunggu', 422, 'Pendaftaran ini sudah diproses.');

        $data = $request->validate(['catatan_verifikasi' => 'required|string|max:500']);
        $iduka->update(['status' => 'ditolak', 'catatan_verifikasi' => $data['catatan_verifikasi']]);

        if ($iduka->user) {
            NotificationDispatcher::send(
                $iduka->user,
                'lowongan',
                'Pendaftaran ditolak',
                "Pendaftaran IDUKA Anda ditolak: {$data['catatan_verifikasi']}",
                '/bursakerjakhusus/masuk'
            );
        }

        return $iduka->fresh();
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

        // 'telepon' nullable — akun IDUKA login pakai email dan tidak wajib
        // punya no HP, beda dari Instruktur yang wajib.
        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'telepon' => ['nullable', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
        ]);

        $user->update([
            'name'  => $data['name'],
            'phone' => $data['telepon'] ?? $user->phone,
        ]);

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
     * GPS dari nol. Login pakai No. HP saja (BUKAN email — itu khusus akun
     * IDUKA milik perusahaan sendiri, lihat Iduka::user()).
     */
    public function storeInstruktur(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'telepon'  => 'required|string|max:30|unique:users,phone',
            'password' => 'nullable|min:6',
            'iduka_id' => 'required|exists:idukas,id',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'phone'    => $data['telepon'],
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

}
