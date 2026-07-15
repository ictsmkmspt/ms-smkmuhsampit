<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    public function index(Request $request)
    {
        $query = Holiday::orderBy('date');

        if ($request->year) {
            $query->whereYear('date', $request->year);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'date'       => 'required|date|unique:holidays,date',
            'keterangan' => 'required|string|max:150',
        ], [
            'date.unique' => 'Tanggal ini sudah tercatat sebagai hari libur.',
        ]);

        $holiday = Holiday::create($data);

        return response()->json([
            'message' => 'Hari libur "' . $holiday->keterangan . '" (' . $holiday->date . ') berhasil ditambahkan.',
            'holiday' => $holiday,
        ], 201);
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();
        return response()->json(['message' => 'Hari libur dihapus.']);
    }
}
