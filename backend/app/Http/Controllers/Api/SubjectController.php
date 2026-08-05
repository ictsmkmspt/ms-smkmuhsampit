<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index()
    {
        return Subject::orderBy('nama')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kode' => 'required|string|max:20|unique:subjects,kode',
            'nama' => 'required|string|max:100',
        ]);

        return response()->json(Subject::create($data), 201);
    }

    public function update(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'kode' => 'required|string|max:20|unique:subjects,kode,' . $subject->id,
            'nama' => 'required|string|max:100',
        ]);

        $subject->update($data);

        return $subject->fresh();
    }

    public function destroy(Subject $subject)
    {
        if ($subject->teachingAssignments()->exists() || $subject->schedules()->exists()) {
            return response()->json(['message' => 'Mata pelajaran ini sudah dipakai di pembagian tugas mengajar atau jadwal, tidak bisa dihapus.'], 422);
        }

        $subject->delete();

        return response()->json(['message' => 'Mata pelajaran dihapus.']);
    }
}
