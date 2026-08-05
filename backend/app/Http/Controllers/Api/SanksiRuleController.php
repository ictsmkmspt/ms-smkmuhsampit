<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SanksiRule;
use App\Models\Student;
use Illuminate\Http\Request;

class SanksiRuleController extends Controller
{
    public function index()
    {
        return SanksiRule::orderBy('min_poin')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'min_poin' => 'required|integer|min:0',
            'max_poin' => 'nullable|integer|gte:min_poin',
            'tindakan' => 'required|string',
            'urutan' => 'nullable|integer|min:0',
        ]);

        // Frontend belum punya input buat "urutan" — kalau tidak dikirim,
        // middleware Laravel mengubah string kosong jadi null, dan kolom ini
        // NOT NULL di database (default 0), jadi harus dijaga di sini juga.
        $data['urutan'] = $data['urutan'] ?? 0;

        return response()->json(SanksiRule::create($data), 201);
    }

    public function update(Request $request, SanksiRule $sanksiRule)
    {
        $data = $request->validate([
            'nama' => 'required|string|max:100',
            'min_poin' => 'required|integer|min:0',
            'max_poin' => 'nullable|integer|gte:min_poin',
            'tindakan' => 'required|string',
            'urutan' => 'nullable|integer|min:0',
        ]);

        $data['urutan'] = $data['urutan'] ?? 0;

        $sanksiRule->update($data);

        return $sanksiRule->fresh();
    }

    public function destroy(SanksiRule $sanksiRule)
    {
        $sanksiRule->delete();

        return response()->json(['message' => 'Aturan sanksi dihapus.']);
    }

    /**
     * Daftar siswa aktif beserta tahap sanksi yang berlaku SEKARANG,
     * dihitung otomatis dari total_poin siswa terhadap rentang tiap aturan —
     * ini "eskalasi otomatis" yang dipakai Waka Kesiswaan, tanpa perlu ada
     * proses/cron terpisah yang mengubah data siswa.
     */
    public function siswa(Request $request)
    {
        $rules = SanksiRule::orderBy('min_poin')->get();

        $query = Student::with(['user', 'classRoom'])->where('status', 'aktif')->where('total_poin', '>', 0);
        if ($request->filled('class_room_id')) {
            $query->where('class_room_id', $request->class_room_id);
        }

        return $query->orderByDesc('total_poin')->get()->map(function ($student) use ($rules) {
            $applicable = $rules->last(fn ($rule) => $student->total_poin >= $rule->min_poin
                && ($rule->max_poin === null || $student->total_poin <= $rule->max_poin));

            return [
                'student' => $student,
                'sanksi' => $applicable,
            ];
        })->values();
    }
}
