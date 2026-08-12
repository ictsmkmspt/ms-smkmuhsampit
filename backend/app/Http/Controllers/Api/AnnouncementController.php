<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;

/**
 * Papan pengumuman — semua guru boleh membuat, dan cuma boleh
 * mengubah/menghapus pengumumannya SENDIRI (dicek dibuat_oleh). Siswa &
 * orang tua/wali cuma baca — lihat routes/api.php, GET-nya dipisah ke
 * grup role yang lebih luas daripada POST/PUT/DELETE.
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
        ]);

        $data['dibuat_oleh'] = $request->user()->id;

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

    public function destroy(Request $request, Announcement $announcement)
    {
        if ($announcement->dibuat_oleh !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh menghapus pengumuman sendiri.'], 403);
        }

        $announcement->delete();

        return response()->json(['message' => 'Pengumuman dihapus.']);
    }
}
