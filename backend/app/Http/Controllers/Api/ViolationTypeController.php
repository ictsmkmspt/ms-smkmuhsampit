<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ViolationType;
use Illuminate\Http\Request;

class ViolationTypeController extends Controller
{
    public function index()
    {
        return ViolationType::orderByRaw('system_key IS NULL')->orderBy('id')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:violation_types,name',
            'poin' => 'required|integer|min:0|max:100',
        ]);

        return response()->json(ViolationType::create($data), 201);
    }

    public function update(Request $request, ViolationType $violationType)
    {
        $rules = ['poin' => 'required|integer|min:0|max:100'];

        if (!$violationType->isSystem()) {
            $rules['name'] = 'required|string|max:100|unique:violation_types,name,' . $violationType->id;
        }

        $violationType->update($request->validate($rules));

        return response()->json($violationType->fresh());
    }

    public function destroy(ViolationType $violationType)
    {
        if ($violationType->isSystem()) {
            return response()->json([
                'message' => 'Jenis pelanggaran sistem (Terlambat / Tidak Hadir) tidak dapat dihapus.',
            ], 422);
        }

        if ($violationType->violations()->exists()) {
            return response()->json([
                'message' => 'Jenis pelanggaran ini sudah pernah dicatat untuk siswa, tidak bisa dihapus. Kamu tetap bisa mengubah nama/poinnya.',
            ], 422);
        }

        $violationType->delete();

        return response()->json(['message' => 'Jenis pelanggaran dihapus.']);
    }
}
