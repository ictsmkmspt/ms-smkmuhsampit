<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use Illuminate\Http\Request;

class ClassRoomController extends Controller
{
    public function index()
    {
        return ClassRoom::withCount('students')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:50']);
        return ClassRoom::create($data);
    }

    public function update(Request $request, ClassRoom $classRoom)
    {
        $data = $request->validate(['name' => 'required|string|max:50']);
        $classRoom->update($data);
        return $classRoom;
    }

    public function destroy(ClassRoom $classRoom)
    {
        $classRoom->delete();
        return response()->json(['message' => 'Kelas dihapus.']);
    }
}
