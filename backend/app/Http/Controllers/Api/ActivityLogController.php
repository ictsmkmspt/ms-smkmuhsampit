<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

/**
 * Log Aktivitas — admin-only (route digerbangi role:admin), melihat
 * aktivitas SEMUA role, jadi tidak dibagi ke waka manapun seperti
 * submenu Laporan lain. Pagination server-side murni (bukan fetch-all
 * lalu slice) karena tabel ini tidak dibatasi retensi.
 */
class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        // orderByDesc('id') SENGAJA dipakai, bukan latest()/created_at
        // saja — kolom timestamp MySQL cuma presisi 1 detik, dan log
        // aktivitas ini sering tercipta banyak sekaligus dalam detik yang
        // sama (mis. operasi massal), jadi urutan berdasarkan created_at
        // doang tidak pasti untuk baris yang timestamp-nya identik.
        $query = ActivityLog::with('user')->orderByDesc('id');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('aksi')) {
            $query->where('aksi', $request->aksi);
        }
        if ($request->filled('model_type')) {
            $query->where('model_type', $request->model_type);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($sub) use ($q) {
                $sub->where('model_label', 'like', "%{$q}%")
                    ->orWhere('actor_nama', 'like', "%{$q}%");
            });
        }

        return $query->paginate(30);
    }

    /**
     * Daftar model_type yang benar-benar ada di data (bukan daftar tetap
     * 61 model) — dipakai untuk isi dropdown filter "Jenis Data" di
     * frontend supaya tidak menampilkan pilihan yang tidak pernah ada
     * lognya sama sekali.
     */
    public function modelTypes()
    {
        return ActivityLog::whereNotNull('model_type')
            ->distinct()
            ->orderBy('model_type')
            ->pluck('model_type');
    }
}
