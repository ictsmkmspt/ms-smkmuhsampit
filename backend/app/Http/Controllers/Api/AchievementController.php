<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\RestrictsGuruToOwnClass;
use App\Models\Achievement;
use App\Models\AchievementType;
use App\Models\Student;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AchievementController extends Controller
{
    use RestrictsGuruToOwnClass;

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

    /**
     * Akumulasi poin prestasi per siswa. Kalau yang login guru, dipaksa hanya kelas walinya sendiri.
     * Default pakai kolom total_prestasi (cache, cepat) untuk tahun ajaran aktif. Kalau
     * ?tahun_ajaran_id= diisi dengan tahun ajaran LAIN, dihitung ulang live dari riwayat
     * Achievement tahun itu — supaya tidak perlu ubah tahun ajaran aktif cuma buat lihat rekap lama.
     */
    public function summary(Request $request)
    {
        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? (int) $request->tahun_ajaran_id : TahunAjaran::aktifId();

        $query = Student::with(['user', 'classRoom'])->where('status', 'aktif');
        if ($classRoomId) $query->where('class_room_id', $classRoomId);

        if ($tahunAjaranId === TahunAjaran::aktifId()) {
            return $query->orderByDesc('total_prestasi')->get();
        }

        return $query->withSum(['achievements as riwayat_prestasi' => function ($q) use ($tahunAjaranId) {
                $q->where('tahun_ajaran_id', $tahunAjaranId);
            }], 'poin')
            ->get()
            ->each(function ($s) {
                $s->total_prestasi = (int) ($s->riwayat_prestasi ?? 0);
                unset($s->riwayat_prestasi);
            })
            ->sortByDesc('total_prestasi')
            ->values();
    }

    /**
     * Riwayat kejadian prestasi. Kalau yang login guru, dipaksa hanya kelas walinya sendiri.
     * Default cuma tahun ajaran yang sedang aktif — kirim ?tahun_ajaran_id= untuk lihat tahun
     * ajaran lain, atau ?semua_tahun=1 untuk lihat semua tahun ajaran sekaligus.
     */
    public function detail(Request $request)
    {
        $restricted  = $this->guruClassRoomId($request);
        $classRoomId = $restricted ?? $request->class_room_id;

        $query = Achievement::with('student.user', 'student.classRoom', 'achievementType');
        if ($request->date) $query->where('date', $request->date);
        if ($classRoomId) $query->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        if (!$request->boolean('semua_tahun')) {
            $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }
        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }

    /**
     * Riwayat prestasi 1 siswa tertentu, dengan filter opsional
     * rentang tanggal (date_from/date_to) dan jenis prestasi (achievement_type_id).
     * Dipakai oleh popup riwayat prestasi di halaman Rekap Poin Prestasi.
     * Kalau yang login guru, hanya boleh melihat siswa di kelas walinya sendiri.
     * Default cuma tahun ajaran yang sedang aktif — kirim ?tahun_ajaran_id= untuk lihat
     * tahun ajaran lain, atau ?semua_tahun=1 untuk lihat semua.
     */
    public function studentAchievements(Request $request, $studentId)
    {
        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null) {
            $student = Student::find($studentId);
            if (!$student || $student->class_room_id !== $restricted) {
                return response()->json(['message' => 'Anda tidak berwenang melihat data siswa ini.'], 403);
            }
        }

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
        if (!$request->boolean('semua_tahun')) {
            $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();
            $query->where('tahun_ajaran_id', $tahunAjaranId);
        }

        return $query->orderByDesc('date')->orderByDesc('created_at')->get();
    }

    /**
     * Hapus 1 catatan prestasi yang salah input, dan kembalikan poinnya dari total_prestasi siswa.
     * Kalau yang login guru, hanya boleh menghapus siswa di kelas walinya sendiri.
     */
    public function destroy(Request $request, $id)
    {
        $achievement = Achievement::with('student')->find($id);
        if (!$achievement) {
            return response()->json(['message' => 'Catatan prestasi tidak ditemukan.'], 404);
        }

        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null && $achievement->student->class_room_id !== $restricted) {
            return response()->json(['message' => 'Anda tidak berwenang menghapus data siswa ini.'], 403);
        }

        if ($achievement->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Catatan ini milik tahun ajaran yang tidak aktif dan tidak bisa dihapus. Aktifkan dulu tahun ajaran tersebut kalau perlu mengoreksinya.'], 422);
        }

        DB::transaction(function () use ($achievement) {
            $achievement->student->tambahPrestasi(-$achievement->poin);
            $achievement->delete();
        });

        return response()->json(['message' => 'Catatan prestasi berhasil dihapus.']);
    }

    /**
     * Ubah jenis prestasi dan/atau catatan pada 1 catatan prestasi yang salah input.
     * Poin otomatis ikut menyesuaikan ke poin jenis prestasi yang baru, dan total_prestasi
     * siswa disesuaikan (poin lama dikembalikan, poin baru ditambahkan). Kalau yang login guru,
     * hanya boleh mengubah siswa di kelas walinya sendiri.
     */
    public function update(Request $request, $id)
    {
        $achievement = Achievement::with('student')->find($id);
        if (!$achievement) {
            return response()->json(['message' => 'Catatan prestasi tidak ditemukan.'], 404);
        }

        $restricted = $this->guruClassRoomId($request);
        if ($restricted !== null && $achievement->student->class_room_id !== $restricted) {
            return response()->json(['message' => 'Anda tidak berwenang mengubah data siswa ini.'], 403);
        }

        if ($achievement->tahun_ajaran_id !== TahunAjaran::aktifId()) {
            return response()->json(['message' => 'Catatan ini milik tahun ajaran yang tidak aktif dan tidak bisa diubah. Aktifkan dulu tahun ajaran tersebut kalau perlu mengoreksinya.'], 422);
        }

        $data = $request->validate([
            'achievement_type_id' => 'required|exists:achievement_types,id',
            'note'                => 'nullable|string|max:255',
        ]);

        $newType = AchievementType::findOrFail($data['achievement_type_id']);

        DB::transaction(function () use ($achievement, $newType, $data) {
            $achievement->student->tambahPrestasi($newType->poin - $achievement->poin);
            $achievement->update([
                'achievement_type_id' => $newType->id,
                'poin'                => $newType->poin,
                'note'                => $data['note'] ?? $achievement->note,
            ]);
        });

        return response()->json([
            'message'     => 'Catatan prestasi berhasil diperbarui.',
            'achievement' => $achievement->fresh(),
        ]);
    }


    /**
     * 10 siswa dengan poin prestasi tertinggi — dipakai kartu "Leaderboard"
     * di beranda Guru, Siswa, dan Wali.
     */
    public function leaderboard()
    {
        return \App\Models\Student::with(['user', 'classRoom'])
            ->where('status', 'aktif')
            ->where('total_prestasi', '>', 0)
            ->orderByDesc('total_prestasi')
            ->limit(10)
            ->get();
    }
}
