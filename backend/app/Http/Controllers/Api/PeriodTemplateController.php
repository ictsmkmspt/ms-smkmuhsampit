<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PeriodTemplate;
use Illuminate\Http\Request;

class PeriodTemplateController extends Controller
{
    public function index()
    {
        return PeriodTemplate::orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
            ->orderBy('waktu_mulai')
            ->get();
    }

    private function rules(): array
    {
        return [
            'hari' => 'required|in:senin,selasa,rabu,kamis,jumat,sabtu',
            'jam_ke' => 'nullable|string|max:10',
            'waktu_mulai' => 'required|date_format:H:i',
            'waktu_selesai' => 'required|date_format:H:i|after:waktu_mulai',
            'tipe' => 'required|in:pelajaran,khusus',
            'label_khusus' => 'required_if:tipe,khusus|nullable|string|max:150',
            'warna' => 'nullable|string|max:7',
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules());
        if ($data['tipe'] === 'pelajaran') {
            $data['label_khusus'] = null;
        }

        return response()->json(PeriodTemplate::create($data), 201);
    }

    public function update(Request $request, PeriodTemplate $periodTemplate)
    {
        $data = $request->validate($this->rules());
        if ($data['tipe'] === 'pelajaran') {
            $data['label_khusus'] = null;
        }

        $periodTemplate->update($data);

        return $periodTemplate->fresh();
    }

    public function destroy(PeriodTemplate $periodTemplate)
    {
        $periodTemplate->delete();

        return response()->json(['message' => 'Baris template dihapus.']);
    }
}
