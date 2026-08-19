<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TahfidzScore;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Tahfidz (hafalan Al-Quran) — dicatat per surah + rentang ayat yang
 * benar-benar dihafal (sama struktur dengan Tadarus), BUKAN langsung
 * pilih nomor juz — praktik hafalan sebenarnya per surah/ayat, sedangkan
 * juz cuma pembagian 1/30 volume mushaf yang tidak selaras batas surah.
 * SEMUA guru boleh mencatat untuk siswa manapun (tidak dikunci Tugas
 * Mengajar). Juga tidak terikat tahun ajaran — hafalan murid berjalan
 * terus lintas tahun, bukan sesuatu yang "reset" tiap ganti tahun ajaran.
 */
class TahfidzScoreController extends Controller
{
    private function validasiRentangAyat(array $entries): void
    {
        $surahList = config('quran_surah');
        foreach ($entries as $i => $entry) {
            $surah = $surahList[$entry['surah']] ?? null;
            if (!$surah) {
                throw ValidationException::withMessages(["entries.{$i}.surah" => ['Nomor surah tidak valid.']]);
            }
            if ($entry['ayat_selesai'] < $entry['ayat_mulai']) {
                throw ValidationException::withMessages(["entries.{$i}.ayat_selesai" => ['Ayat selesai tidak boleh kurang dari ayat mulai.']]);
            }
            if ($entry['ayat_selesai'] > $surah['jumlah_ayat']) {
                throw ValidationException::withMessages(["entries.{$i}.ayat_selesai" => ["Surah {$surah['nama']} cuma punya {$surah['jumlah_ayat']} ayat."]]);
            }
        }
    }

    public function index(Request $request)
    {
        $data = $request->validate([
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'student_id' => 'nullable|exists:students,id',
        ]);

        return TahfidzScore::with(['student.user', 'student.classRoom', 'recordedBy'])
            ->when(!empty($data['class_room_id']), fn ($q) => $q->whereHas('student', fn ($q2) => $q2->where('class_room_id', $data['class_room_id'])))
            ->when(!empty($data['student_id']), fn ($q) => $q->where('student_id', $data['student_id']))
            ->orderByDesc('tanggal')
            ->orderByDesc('created_at')
            ->get();
    }

    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'tanggal' => 'required|date',
            'entries' => 'required|array|min:1',
            'entries.*.student_id' => 'required|exists:students,id',
            'entries.*.surah' => 'required|integer|min:1|max:114',
            'entries.*.ayat_mulai' => 'required|integer|min:1',
            'entries.*.ayat_selesai' => 'required|integer|min:1',
            'entries.*.keterangan' => 'nullable|string|max:255',
        ]);

        $this->validasiRentangAyat($data['entries']);

        foreach ($data['entries'] as $entry) {
            TahfidzScore::create([
                'student_id' => $entry['student_id'],
                'surah' => $entry['surah'],
                'ayat_mulai' => $entry['ayat_mulai'],
                'ayat_selesai' => $entry['ayat_selesai'],
                'keterangan' => $entry['keterangan'] ?? null,
                'tanggal' => $data['tanggal'],
                'recorded_by' => $request->user()->id,
            ]);
        }

        return response()->json(['message' => count($data['entries']) . ' catatan Tahfidz berhasil disimpan.'], 201);
    }

    public function update(Request $request, TahfidzScore $tahfidzScore)
    {
        if ($tahfidzScore->recorded_by !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh mengubah catatan Tahfidz yang Anda catat sendiri.'], 403);
        }

        $data = $request->validate([
            'surah' => 'required|integer|min:1|max:114',
            'ayat_mulai' => 'required|integer|min:1',
            'ayat_selesai' => 'required|integer|min:1',
            'keterangan' => 'nullable|string|max:255',
            'tanggal' => 'required|date',
        ]);

        $this->validasiRentangAyat([$data]);

        $tahfidzScore->update($data);

        return $tahfidzScore->fresh('student.user');
    }

    public function destroy(Request $request, TahfidzScore $tahfidzScore)
    {
        if ($tahfidzScore->recorded_by !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh menghapus catatan Tahfidz yang Anda catat sendiri.'], 403);
        }

        $tahfidzScore->delete();

        return response()->json(['message' => 'Catatan Tahfidz dihapus.']);
    }

    public function myScores(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json([]);
        }

        return TahfidzScore::where('student_id', $student->id)
            ->orderByDesc('tanggal')
            ->get();
    }
}
