<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AchievementType;
use Illuminate\Http\Request;

class AchievementTypeController extends Controller
{
    public function index()
    {
        return AchievementType::orderBy('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:achievement_types,name',
            'poin' => 'required|integer|min:0|max:100',
        ]);
        return response()->json(AchievementType::create($data), 201);
    }

    public function update(Request $request, AchievementType $achievementType)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:achievement_types,name,' . $achievementType->id,
            'poin' => 'required|integer|min:0|max:100',
        ]);
        $achievementType->update($data);
        return response()->json($achievementType->fresh());
    }

    public function destroy(AchievementType $achievementType)
    {
        if ($achievementType->achievements()->exists()) {
            return response()->json(['message' => 'Jenis prestasi ini sudah pernah dicatat, tidak bisa dihapus.'], 422);
        }
        $achievementType->delete();
        return response()->json(['message' => 'Jenis prestasi dihapus.']);
    }
}
