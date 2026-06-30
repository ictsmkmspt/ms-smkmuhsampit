<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with(['user', 'classRoom']);
        if ($request->class_room_id) {
            $query->where('class_room_id', $request->class_room_id);
        }
        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'nis' => 'required|string|unique:students,nis',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => bcrypt($data['password']),
                'role' => 'siswa',
            ]);

            $student = Student::create([
                'user_id' => $user->id,
                'class_room_id' => $data['class_room_id'] ?? null,
                'nis' => $data['nis'],
                'barcode_code' => 'STD-' . strtoupper(Str::random(8)),
            ]);

            return $student->load(['user', 'classRoom']);
        });
    }

    public function update(Request $request, Student $student)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        if (isset($data['name'])) {
            $student->user->update(['name' => $data['name']]);
        }
        $student->update($request->only('class_room_id'));

        return $student->load(['user', 'classRoom']);
    }

    public function destroy(Student $student)
    {
        $student->user->delete();
        return response()->json(['message' => 'Siswa dihapus.']);
    }
}
