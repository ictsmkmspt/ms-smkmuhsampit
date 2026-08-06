<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index()
    {
        return Room::withCount('assets')->with('teacher.user')->orderBy('nama')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'jenis' => 'required|in:kelas,lab,bengkel,kantor,lainnya',
            'kapasitas' => 'nullable|integer|min:0',
            'teacher_id' => 'nullable|exists:teachers,id',
            'keterangan' => 'nullable|string',
        ]);

        return response()->json(Room::create($data)->load('teacher.user'), 201);
    }

    public function update(Request $request, Room $room)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'jenis' => 'required|in:kelas,lab,bengkel,kantor,lainnya',
            'kapasitas' => 'nullable|integer|min:0',
            'teacher_id' => 'nullable|exists:teachers,id',
            'keterangan' => 'nullable|string',
        ]);

        $room->update($data);

        return $room->fresh()->load('teacher.user');
    }

    public function destroy(Room $room)
    {
        if ($room->assets()->exists()) {
            return response()->json(['message' => 'Ruang ini masih punya aset terdaftar, pindahkan asetnya dulu sebelum menghapus.'], 422);
        }

        $room->delete();

        return response()->json(['message' => 'Data ruang dihapus.']);
    }
}
