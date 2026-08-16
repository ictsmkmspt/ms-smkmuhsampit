<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PklPembimbinganJournal;
use App\Models\PklPlacement;
use Illuminate\Http\Request;

class PklPembimbinganJournalController extends Controller
{
    /**
     * Daftar catatan kunjungan/bimbingan — otomatis dibatasi sesuai siapa yang
     * login: guru cuma lihat catatannya sendiri, DUDI cuma lihat catatan yang
     * ditujukan ke tempatnya, admin & waka_kurikulum lihat semua (dipakai
     * juga oleh Laporan PKL > Monitoring Guru). Bisa disaring lebih lanjut
     * dengan ?dudi_id=, ?only_pending=1 (yang belum diverifikasi saja), atau
     * ?teacher_id= (khusus admin/waka_kurikulum, buat pilih 1 guru pendamping).
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
        } elseif (!in_array($user->role, ['admin', 'waka_kurikulum'])) {
            return response()->json(['message' => 'Anda tidak berwenang mengakses data ini.'], 403);
        }

        if ($request->dudi_id) {
            $query->where('dudi_id', $request->dudi_id);
        }
        if ($request->boolean('only_pending')) {
            $query->whereNull('verified_at');
        }
        if ($request->teacher_id && in_array($user->role, ['admin', 'waka_kurikulum'])) {
            $query->where('teacher_id', $request->teacher_id);
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

        // dudi_id cuma divalidasi exists:dudis,id di atas — itu tidak
        // membuktikan guru ini benar pembimbing di DUDI itu. Tanpa cek
        // ini, guru mana pun bisa kirim dudi_id sembarangan langsung ke
        // API (dropdown di frontend cuma menyaring pilihan di UI, bukan
        // proteksi sungguhan) dan bikin catatan kunjungan ke IDUKA yang
        // bukan bimbingannya.
        $adalahPembimbing = PklPlacement::where('dudi_id', $data['dudi_id'])
            ->where('guru_pembimbing_id', $teacher->id)
            ->exists();
        if (!$adalahPembimbing) {
            return response()->json(['message' => 'Anda bukan guru pembimbing untuk siswa manapun di IDUKA ini.'], 403);
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
     * Guru pembimbing mengedit catatannya sendiri — cuma boleh SELAMA belum
     * diverifikasi (diparaf) DUDI, supaya data yang sudah disahkan tidak
     * berubah diam-diam.
     */
    public function update(Request $request, PklPembimbinganJournal $pklPembimbinganJournal)
    {
        $user = $request->user();
        $teacher = $user->teacher;

        if ($user->role !== 'guru' || !$teacher || $pklPembimbinganJournal->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah catatan ini.'], 403);
        }

        if ($pklPembimbinganJournal->verified_at) {
            return response()->json(['message' => 'Catatan ini sudah diverifikasi DUDI, tidak bisa diubah lagi.'], 422);
        }

        $data = $request->validate([
            'date'      => 'required|date',
            'aktivitas' => 'required|string|max:2000',
            'catatan'   => 'nullable|string|max:2000',
        ]);

        $pklPembimbinganJournal->update($data);

        return response()->json([
            'message' => 'Catatan bimbingan berhasil diperbarui.',
            'jurnal'  => $pklPembimbinganJournal->fresh(['teacher.user', 'dudi']),
        ]);
    }

    /**
     * Guru pembimbing menghapus catatannya sendiri — sama seperti edit,
     * cuma boleh selama belum diverifikasi DUDI.
     */
    public function destroy(Request $request, PklPembimbinganJournal $pklPembimbinganJournal)
    {
        $user = $request->user();
        $teacher = $user->teacher;

        if ($user->role !== 'guru' || !$teacher || $pklPembimbinganJournal->teacher_id !== $teacher->id) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus catatan ini.'], 403);
        }

        if ($pklPembimbinganJournal->verified_at) {
            return response()->json(['message' => 'Catatan ini sudah diverifikasi DUDI, tidak bisa dihapus lagi.'], 422);
        }

        $pklPembimbinganJournal->delete();

        return response()->json(['message' => 'Catatan bimbingan berhasil dihapus.']);
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
