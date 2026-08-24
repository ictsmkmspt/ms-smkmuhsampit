<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TadarusScore;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Tadarus (membaca Al-Quran, bukan menghafal) — dicatat per surah + rentang
 * ayat. Sama seperti Tahsin/Tahfidz, SEMUA guru boleh mencatat untuk siswa
 * manapun, dan tidak terikat tahun ajaran.
 */
class TadarusScoreController extends Controller
{
    /**
     * Daftar 114 surah (nomor, nama, jumlah ayat) — dipakai dropdown &
     * validasi rentang ayat di frontend.
     */
    public function daftarSurah()
    {
        return collect(config('quran_surah'))
            ->map(fn ($s, $nomor) => ['nomor' => $nomor, 'nama' => $s['nama'], 'jumlah_ayat' => $s['jumlah_ayat']])
            ->values();
    }

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

        return TadarusScore::with(['student.user', 'student.classRoom', 'recordedBy'])
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

        $surahList = config('quran_surah');
        $students = Student::with(['user', 'parents'])->whereIn('id', collect($data['entries'])->pluck('student_id'))->get()->keyBy('id');

        foreach ($data['entries'] as $entry) {
            TadarusScore::create([
                'student_id' => $entry['student_id'],
                'surah' => $entry['surah'],
                'ayat_mulai' => $entry['ayat_mulai'],
                'ayat_selesai' => $entry['ayat_selesai'],
                'keterangan' => $entry['keterangan'] ?? null,
                'tanggal' => $data['tanggal'],
                'recorded_by' => $request->user()->id,
            ]);

            $student = $students->get($entry['student_id']);
            if ($student) {
                $namaSurah = $surahList[$entry['surah']]['nama'] ?? "Surah #{$entry['surah']}";
                $pesan = "Setoran Tadarus {$namaSurah} ayat {$entry['ayat_mulai']}-{$entry['ayat_selesai']} tercatat.";
                NotificationDispatcher::send($student->user, 'nilai', 'Nilai Tadarus baru', $pesan, '/siswa');
                NotificationDispatcher::sendMany($student->parents, 'nilai', 'Nilai Tadarus anak Anda', "{$student->user->name} — {$pesan}", '/wali');
            }
        }

        return response()->json(['message' => count($data['entries']) . ' catatan Tadarus berhasil disimpan.'], 201);
    }

    public function update(Request $request, TadarusScore $tadarusScore)
    {
        if ($tadarusScore->recorded_by !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh mengubah catatan Tadarus yang Anda catat sendiri.'], 403);
        }

        $data = $request->validate([
            'surah' => 'required|integer|min:1|max:114',
            'ayat_mulai' => 'required|integer|min:1',
            'ayat_selesai' => 'required|integer|min:1',
            'keterangan' => 'nullable|string|max:255',
            'tanggal' => 'required|date',
        ]);

        $this->validasiRentangAyat([$data]);

        $tadarusScore->update($data);

        return $tadarusScore->fresh('student.user');
    }

    public function destroy(Request $request, TadarusScore $tadarusScore)
    {
        if ($tadarusScore->recorded_by !== $request->user()->id) {
            return response()->json(['message' => 'Anda cuma boleh menghapus catatan Tadarus yang Anda catat sendiri.'], 403);
        }

        $tadarusScore->delete();

        return response()->json(['message' => 'Catatan Tadarus dihapus.']);
    }

    public function myScores(Request $request)
    {
        $student = Student::where('user_id', $request->user()->id)->first();
        if (!$student) {
            return response()->json([]);
        }

        return TadarusScore::where('student_id', $student->id)
            ->orderByDesc('tanggal')
            ->get();
    }
}
