<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Holiday;
use Carbon\Carbon;
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

    /**
     * Tambah hari libur untuk rentang tanggal sekaligus (misal libur akhir semester
     * 10 hari), tanpa perlu input satu-satu. Sabtu/Minggu dilewati otomatis karena
     * sudah otomatis dianggap libur, dan tanggal yang sudah tercatat sebelumnya
     * juga dilewati (tidak menimbulkan error, cukup dihitung sebagai "dilewati").
     */
    public function storeRange(Request $request)
    {
        $data = $request->validate([
            'date_from'  => 'required|date',
            'date_to'    => 'required|date|after_or_equal:date_from',
            'keterangan' => 'required|string|max:150',
        ]);

        $start = Carbon::parse($data['date_from']);
        $end   = Carbon::parse($data['date_to']);

        if ($start->diffInDays($end) > 365) {
            return response()->json(['message' => 'Rentang tanggal maksimal 1 tahun.'], 422);
        }

        $existing = Holiday::whereBetween('date', [$start->format('Y-m-d'), $end->format('Y-m-d')])
            ->pluck('date')->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))->all();

        $ditambahkan = 0;
        $dilewatiAkhirPekan = 0;
        $dilewatiSudahAda = 0;

        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if ($d->isWeekend()) {
                $dilewatiAkhirPekan++;
                continue;
            }
            if (in_array($d->format('Y-m-d'), $existing, true)) {
                $dilewatiSudahAda++;
                continue;
            }
            Holiday::create(['date' => $d->format('Y-m-d'), 'keterangan' => $data['keterangan']]);
            $ditambahkan++;
        }

        $pesan = $ditambahkan . ' hari libur berhasil ditambahkan';
        $catatan = [];
        if ($dilewatiAkhirPekan > 0) $catatan[] = $dilewatiAkhirPekan . ' akhir pekan dilewati';
        if ($dilewatiSudahAda > 0) $catatan[] = $dilewatiSudahAda . ' sudah tercatat sebelumnya';
        if ($catatan) $pesan .= ' (' . implode(', ', $catatan) . ')';

        return response()->json(['message' => $pesan . '.', 'ditambahkan' => $ditambahkan]);
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();
        return response()->json(['message' => 'Hari libur dihapus.']);
    }
}
