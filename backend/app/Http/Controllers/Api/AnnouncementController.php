<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Papan pengumuman — semua guru boleh membuat, dan cuma boleh
 * mengubah/menghapus pengumumannya SENDIRI (dicek dibuat_oleh). Siswa &
 * orang tua/wali cuma baca — lihat routes/api.php, GET-nya dipisah ke
 * grup role yang lebih luas daripada POST/PUT/DELETE.
 *
 * Foto opsional, dan sengaja TIDAK permanen — dihapus otomatis setelah 30
 * hari oleh command terjadwal announcements:cleanup-photos (lihat
 * app/Console/Commands/CleanupAnnouncementPhotos.php + routes/console.php)
 * supaya storage server tidak terus membengkak, tapi teks pengumumannya
 * sendiri tetap tersimpan sebagai arsip.
 *
 * Batas ukuran foto 2MB SENGAJA disamakan dengan upload_max_filesize
 * php.ini server (bukan dipilih bebas) — kalau dinaikkan di sini tanpa
 * ikut menaikkan php.ini di server (dev maupun VPS produksi, keduanya
 * terpisah & tidak ikut ter-deploy lewat git), upload di atas batas
 * php.ini akan tetap gagal ditolak PHP duluan sebelum sampai ke validasi
 * Laravel ini.
 */
class AnnouncementController extends Controller
{
    public function index()
    {
        return Announcement::with('dibuatOleh')->orderByDesc('created_at')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string',
            'foto' => 'nullable|image|max:2048',
        ]);

        $data['dibuat_oleh'] = $request->user()->id;

        if ($request->hasFile('foto')) {
            $data['foto'] = $request->file('foto')->store('pengumuman', 'public');
        }

        return response()->json(Announcement::create($data)->load('dibuatOleh'), 201);
    }

    public function update(Request $request, Announcement $announcement)
    {
        if ($announcement->dibuat_oleh !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh mengubah pengumuman sendiri.'], 403);
        }

        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string',
        ]);

        $announcement->update($data);

        return $announcement->fresh('dibuatOleh');
    }

    /**
     * Unggah/ganti foto pengumuman yang sudah ada — endpoint terpisah dari
     * update() (sama seperti SchoolProfileController::uploadLogo dan
     * DudiController::uploadTandaTangan) karena PUT+multipart bermasalah
     * di PHP, jadi dipakai POST tersendiri.
     */
    public function uploadFoto(Request $request, Announcement $announcement)
    {
        if ($announcement->dibuat_oleh !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh mengubah pengumuman sendiri.'], 403);
        }

        $request->validate([
            'foto' => 'required|image|max:2048',
        ]);

        if ($announcement->foto) {
            Storage::disk('public')->delete($announcement->foto);
        }

        $announcement->update(['foto' => $request->file('foto')->store('pengumuman', 'public')]);

        return $announcement->fresh('dibuatOleh');
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        if ($announcement->dibuat_oleh !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh menghapus pengumuman sendiri.'], 403);
        }

        if ($announcement->foto) {
            Storage::disk('public')->delete($announcement->foto);
        }

        $announcement->delete();

        return response()->json(['message' => 'Pengumuman dihapus.']);
    }
}
