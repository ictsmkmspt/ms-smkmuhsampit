<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\AchievementType;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AchievementController extends Controller
{
    public function types()
    {
        return AchievementType::orderBy('name')->get();
    }

    public function record(Request $request)
    {
        $data = $request->validate([
            'student_id'          => 'required|exists:students,id',
            'achievement_type_id' => 'required|exists:achievement_types,id',
            'note'                => 'nullable|string|max:255',
        ]);

        $achievementType = AchievementType::findOrFail($data['achievement_type_id']);
        $student         = Student::with('user')->findOrFail($data['student_id']);

        $achievement = DB::transaction(function () use ($student, $achievementType, $data, $request) {
            $a = Achievement::create([
                'student_id'          => $student->id,
                'achievement_type_id' => $achievementType->id,
                'date'                => now()->format('Y-m-d'),
                'poin'                => $achievementType->poin,
                'note'                => $data['note'] ?? null,
                'recorded_by'         => $request->user()->id,
            ]);
            $student->tambahPrestasi($achievementType->poin);
            return $a;
        });

        return response()->json([
            'message'     => 'Prestasi "' . $achievementType->name . '" dicatat untuk ' . $student->user->name . ' (+' . $achievementType->poin . ' poin).',
            'achievement' => $achievement,
        ], 201);
    }

    public function summary(Request $request)
    {
        $query = Student::with(['user', 'classRoom']);
        if ($request->class_room_id) {
            $query->where('class_room_id', $request->class_room_id);
        }
        return $query->orderByDesc('total_prestasi')->get();
    }

    public function studentAchievements(Request $request, $studentId)
    {
        $query = Achievement::with('achievementType')
            ->where('student_id', $studentId);

        if ($request->date_from) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->achievement_type_id) {
            $query->where('achievement_type_id', $request->achievement_type_id);
        }

        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }
}
