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

class IdukaController extends Controller
{
    use ResetsPasswordToDefault;


    /**
     * Daftar semua IDUKA (dipakai admin untuk kelola daftar, dan sebagai
     * pilihan dropdown saat membuat penempatan PKL).
     */
    public function index()
    {
        return Iduka::with('user')->orderBy('nama_perusahaan')->get();
    }

    /**
     * Buat akun IDUKA baru sekaligus profilnya (lokasi + radius) dalam 1 transaksi,
     * mengikuti pola yang sama seperti StudentController/TeacherController.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:100',
            'telepon'          => 'required|string|max:30|unique:users,phone',
            'password'         => 'nullable|min:6',
            'nama_perusahaan'  => 'required|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'radius_meter'     => 'required|integer|min:10|max:5000',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name'     => $data['name'],
                'phone'    => $data['telepon'],
                'password' => bcrypt($data['password'] ?? '123456'),
                'role'     => 'iduka',
            ]);

            $iduka = Iduka::create([
                'user_id'          => $user->id,
                'nama_perusahaan'  => $data['nama_perusahaan'],
                'alamat'           => $data['alamat'] ?? null,
                'penanggung_jawab' => $data['penanggung_jawab'] ?? null,
                'telepon'          => $data['telepon'],
                'latitude'         => $data['latitude'],
                'longitude'        => $data['longitude'],
                'radius_meter'     => $data['radius_meter'],
            ]);

            return response()->json($iduka->load('user'), 201);
        });
    }

    /**
     * Download file Excel (.xlsx) kosong berisi contoh format kolom untuk import
     * akun IDUKA. Isi datanya, lalu upload lewat fitur Import.
     */
    public function downloadTemplate()
    {
        return Excel::download(new IdukaTemplateExport, 'template_import_iduka.xlsx');
    }

    /**
     * Import banyak akun IDUKA sekaligus dari file Excel (.xlsx) yang diupload.
     * Format kolom harus sesuai template (nama_perusahaan, alamat,
     * penanggung_jawab, telepon, latitude, longitude, radius_meter). Kolom
     * "password" opsional, sama seperti import siswa. Baris yang gagal tidak
     * menghentikan proses, cukup dilaporkan di akhir.
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
            'message'  => $import->successCount . ' IDUKA berhasil diimport, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal'    => $gagal,
        ]);
    }

    public function update(Request $request, Iduka $iduka)
    {
        $data = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'nama_perusahaan'  => 'sometimes|string|max:150',
            'alamat'           => 'nullable|string|max:255',
            'penanggung_jawab' => 'nullable|string|max:100',
            'telepon'          => ['sometimes', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($iduka->user_id)],
            'latitude'         => 'sometimes|numeric|between:-90,90',
            'longitude'        => 'sometimes|numeric|between:-180,180',
            'radius_meter'     => 'sometimes|integer|min:10|max:5000',
        ]);

        if (isset($data['name'])) {
            $iduka->user->update(['name' => $data['name']]);
        }
        // telepon = akun login IDUKA (users.phone) — disinkronkan tiap kali
        // admin mengubahnya di sini, bukan cuma disimpan di profil idukas.
        if (isset($data['telepon'])) {
            $iduka->user->update(['phone' => $data['telepon']]);
        }

        $iduka->update(collect($data)->except('name')->all());

        return $iduka->fresh('user');
    }

    public function destroy(Iduka $iduka)
    {
        $iduka->user->delete();
        return response()->json(['message' => 'Akun IDUKA dihapus.']);
    }

    public function resetPassword(Iduka $iduka)
    {
        $this->resetToDefaultPassword($iduka->user);
        return response()->json(['message' => 'Password akun IDUKA "' . $iduka->nama_perusahaan . '" berhasil direset ke default (123456).']);
    }

    /**
     * Profil IDUKA yang sedang login (dipakai halaman dashboard IDUKA).
     */
    public function myProfile(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }
        return $iduka->load('user');
    }

    /**
     * IDUKA mengubah data profilnya sendiri (bukan admin) — dipakai menu
     * "Edit Profil" di dashboard IDUKA. Sengaja dibatasi cuma nama instruktur
     * & no HP (bukan nama perusahaan/alamat, itu data resmi yang tetap
     * dikelola admin lewat Master Data > IDUKA). No HP wajib diisi (bukan
     * nullable lagi) karena itu sekaligus akun login (users.phone) —
     * mengosongkannya akan mengunci akun ini sendiri. Sengaja tidak
     * termasuk password di sini juga, itu urusan terpisah.
     */
    public function updateProfile(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }

        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'telepon' => ['required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($iduka->user_id)],
        ]);

        $iduka->user->update(['name' => $data['name'], 'phone' => $data['telepon']]);
        $iduka->update(['telepon' => $data['telepon']]);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'iduka'   => $iduka->fresh('user'),
        ]);
    }

    /**
     * IDUKA mengunggah/mengganti gambar tanda tangannya sendiri. Gambar ini
     * dipakai menggantikan tanda centang (✓) di kolom paraf pada halaman
     * cetak jurnal, begitu IDUKA memverifikasi absensi/catatan bimbingan.
     */
    public function uploadTandaTangan(Request $request)
    {
        $iduka = $request->user()->iduka;
        if (!$iduka) {
            return response()->json(['message' => 'Akun ini belum terhubung ke profil IDUKA.'], 404);
        }

        $request->validate([
            'tanda_tangan' => 'required|image|max:2048',
        ]);

        // Hapus file lama dulu (kalau ada) supaya tidak menumpuk file tak terpakai.
        if ($iduka->tanda_tangan) {
            Storage::disk('public')->delete($iduka->tanda_tangan);
        }

        $path = $request->file('tanda_tangan')->store('tanda-tangan', 'public');
        $iduka->update(['tanda_tangan' => $path]);

        return response()->json([
            'message' => 'Tanda tangan berhasil disimpan.',
            'iduka'   => $iduka->fresh('user'),
        ]);
    }
}
