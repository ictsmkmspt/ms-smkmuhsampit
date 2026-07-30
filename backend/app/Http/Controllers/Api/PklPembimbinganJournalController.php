<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklPembimbinganJournal;
use Illuminate\Http\Request;

class PklPembimbinganJournalController extends Controller
{
    /**
     * Daftar catatan kunjungan/bimbingan — otomatis dibatasi sesuai siapa yang
     * login: guru cuma lihat catatannya sendiri, DUDI cuma lihat catatan yang
     * ditujukan ke tempatnya, admin lihat semua. Bisa disaring lebih lanjut
     * dengan ?dudi_id= atau ?only_pending=1 (yang belum diverifikasi saja).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = PklPembimbinganJournal::with(['teacher.user', 'dudi', 'verifiedBy.dudi']);

        if ($user->role === 'guru') {
            $teacher = $user->teacher;
            if (!$teacher) return response()->json([]);
            $query->where('teacher_id', $teacher->id);
        } elseif ($user->role === 'dudi') {
            $dudi = $user->dudi;
            if (!$dudi) return response()->json([]);
            $query->where('dudi_id', $dudi->id);
        } elseif ($user->role !== 'admin') {
            return response()->json(['message' => 'Anda tidak berwenang mengakses data ini.'], 403);
        }

        if ($request->dudi_id) {
            $query->where('dudi_id', $request->dudi_id);
        }
        if ($request->boolean('only_pending')) {
            $query->whereNull('verified_at');
        }

        return $query->orderByDesc('date')->get();
    }

    /**
     * Guru pembimbing menambah 1 catatan kunjungan/aktivitas bimbingan baru ke
     * sebuah DUDI. Mencakup semua siswa bimbingannya di DUDI itu sekaligus,
     * tidak perlu dipilih per siswa.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'dudi_id'   => 'required|exists:dudis,id',
            'date'      => 'required|date',
            'aktivitas' => 'required|string|max:2000',
            'catatan'   => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        $teacher = $user->teacher;
        if ($user->role !== 'guru' || !$teacher) {
            return response()->json(['message' => 'Hanya guru pembimbing yang bisa mengisi jurnal ini.'], 403);
        }

        $jurnal = PklPembimbinganJournal::create([
            'teacher_id' => $teacher->id,
            'dudi_id'    => $data['dudi_id'],
            'date'       => $data['date'],
            'aktivitas'  => $data['aktivitas'],
            'catatan'    => $data['catatan'] ?? null,
        ]);

        return response()->json([
            'message' => 'Catatan bimbingan berhasil ditambahkan.',
            'jurnal'  => $jurnal->load('teacher.user', 'dudi'),
        ], 201);
    }

    /**
     * DUDI (atau admin) memverifikasi (paraf) 1 catatan bimbingan yang ditujukan
     * ke tempatnya — sesuai format jurnal kertas, kolom "Paraf Pimpinan/Pembimbing
     * Iduka" diisi pihak DUDI.
     */
    public function verifikasi(Request $request, PklPembimbinganJournal $pklPembimbinganJournal)
    {
        $user = $request->user();

        $boleh = $user->role === 'admin'
            || ($user->role === 'dudi' && $user->dudi && $pklPembimbinganJournal->dudi_id === $user->dudi->id);

        if (!$boleh) {
            return response()->json(['message' => 'Hanya DUDI atau admin yang bisa memverifikasi catatan ini.'], 403);
        }

        $pklPembimbinganJournal->verified_by = $user->id;
        $pklPembimbinganJournal->verified_at = now();
        $pklPembimbinganJournal->save();

        return response()->json([
            'message' => 'Catatan bimbingan berhasil diverifikasi.',
            'jurnal'  => $pklPembimbinganJournal->fresh('verifiedBy'),
        ]);
    }
}
