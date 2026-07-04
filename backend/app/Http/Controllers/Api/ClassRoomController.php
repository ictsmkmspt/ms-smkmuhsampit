<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassRoomController extends Controller
{
    public function index()
    {
        return ClassRoom::withCount('students')->with('homeroomTeacher.user')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:50',
            'homeroom_teacher_id' => [
                'nullable',
                'exists:teachers,id',
                Rule::unique('class_rooms', 'homeroom_teacher_id'),
            ],
        ], [
            'homeroom_teacher_id.unique' => 'Guru ini sudah menjadi wali kelas di kelas lain.',
        ]);

        $classRoom = ClassRoom::create($data);

        $classRoom->load('homeroomTeacher.user');
        $classRoom->setAttribute('students_count', $classRoom->students()->count());

        return $classRoom;
    }

    // Catatan: sengaja pakai $id biasa (bukan route-model-binding ClassRoom $classRoom)
    // lalu cari manual dengan findOrFail, supaya tidak bergantung pada binding otomatis Laravel.
    public function update(Request $request, $id)
    {
        $classRoom = ClassRoom::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:50',
            'homeroom_teacher_id' => [
                'sometimes',
                'nullable',
                'exists:teachers,id',
                Rule::unique('class_rooms', 'homeroom_teacher_id')->ignore($classRoom->id),
            ],
        ], [
            'homeroom_teacher_id.unique' => 'Guru ini sudah menjadi wali kelas di kelas lain.',
        ]);

        $classRoom->update($data);

        $classRoom->load('homeroomTeacher.user');
        $classRoom->setAttribute('students_count', $classRoom->students()->count());

        return $classRoom;
    }

    public function destroy($id)
    {
        $classRoom = ClassRoom::findOrFail($id);
        $classRoom->delete();
        return response()->json(['message' => 'Kelas dihapus.']);
    }
}
