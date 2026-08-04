<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Achievement;
use App\Models\AchievementType;
use App\Models\Violation;
use App\Models\ViolationType;
use Illuminate\Http\Request;

class DashboardChartController extends Controller
{
    /**
     * Cap jumlah tipe pelanggaran/prestasi yang ditampilkan sebagai batang
     * tersendiri. Tipe di luar cap ini (diurutkan dari yang paling lama
     * terdaftar) digabung jadi 1 batang "Lainnya" supaya grafik tidak
     * membengkak jika admin menambah banyak tipe kustom.
     */
    private const CAP_TIPE = 6;

    /**
     * Data grafik untuk Dashboard Admin: komposisi pelanggaran per jenis dan
     * komposisi prestasi per jenis untuk SATU tanggal terpilih, plus
     * komposisi kehadiran (hadir/izin/sakit/alpa) per HARI untuk seluruh
     * bulan dari tanggal terpilih itu (tanggal 1 s.d. akhir bulan) — dengan
     * opsi filter per kelas. "Alpa" diambil dari catatan Violation type=alpa
     * supaya konsisten dengan angka yang sudah dipakai di Rekap Poin
     * Pelanggaran & total_poin siswa.
     */
    public function grafik(Request $request)
    {
        $tanggal = $request->tanggal ?: now()->format('Y-m-d');
        // Bulan/tahun untuk grafik Absensi bisa digeser independen dari
        // tanggal di atas (dua kontrol navigasi terpisah di dashboard).
        $tahun = (int) ($request->tahun ?: date('Y', strtotime($tanggal)));
        $bulan = (int) ($request->bulan ?: date('n', strtotime($tanggal)));
        $classRoomId = $request->class_room_id !== null && $request->class_room_id !== ''
            ? (int) $request->class_room_id
            : null;

        return response()->json([
            'tanggal' => $tanggal,
            'tahun' => $tahun,
            'bulan' => $bulan,
            'class_room_id' => $classRoomId,
            // "Tidak Hadir" (system_key=alpa) disembunyikan dari grafik Pelanggaran
            // karena sudah punya batang sendiri ("Alpa") di grafik Absensi.
            'pelanggaran' => $this->kategoriHariIni(Violation::class, 'violation_type_id', ViolationType::class, $tanggal, $classRoomId, ['alpa']),
            'prestasi' => $this->kategoriHariIni(Achievement::class, 'achievement_type_id', AchievementType::class, $tanggal, $classRoomId),
            'absensi' => $this->absensiBulanIni($tahun, $bulan, $classRoomId),
        ]);
    }

    /**
     * @return array<int, array{name: string, jumlah: int}>
     */
    private function kategoriHariIni(string $modelClass, string $kolomTipe, string $tipeModelClass, string $tanggal, ?int $classRoomId, array $kecualikanSystemKey = []): array
    {
        $semuaTipe = $tipeModelClass::orderBy('id')->get();
        $idDikecualikan = $semuaTipe
            ->filter(fn ($t) => in_array($t->system_key ?? null, $kecualikanSystemKey, true))
            ->pluck('id')
            ->all();

        $tipeUtama = $semuaTipe
            ->reject(fn ($t) => in_array($t->id, $idDikecualikan, true))
            ->take(self::CAP_TIPE)
            ->pluck('name', 'id');
        $idUtama = $tipeUtama->keys()->all();

        $query = $modelClass::query()->whereDate('date', $tanggal);
        if ($classRoomId) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        }
        if ($idDikecualikan) {
            $query->whereNotIn($kolomTipe, $idDikecualikan);
        }

        $jumlahPerTipe = $query
            ->selectRaw("{$kolomTipe} as tipe_id, COUNT(*) as jumlah")
            ->groupBy('tipe_id')
            ->pluck('jumlah', 'tipe_id');

        $hasil = [];
        foreach ($tipeUtama as $id => $name) {
            $hasil[] = ['name' => $name, 'jumlah' => (int) ($jumlahPerTipe[$id] ?? 0)];
        }

        $lainnya = 0;
        foreach ($jumlahPerTipe as $id => $jumlah) {
            if (!in_array($id, $idUtama, true)) {
                $lainnya += $jumlah;
            }
        }
        if ($lainnya > 0) {
            $hasil[] = ['name' => 'Lainnya', 'jumlah' => (int) $lainnya];
        }

        return $hasil;
    }

    /**
     * Komposisi kehadiran per hari untuk 1 bulan penuh (tanggal 1 s.d. akhir
     * bulan), supaya pola harian (mis. tanggal mana yang alpa-nya menumpuk)
     * kelihatan — tetap 4 nilai terpisah (hadir/izin/sakit/alpa) per hari.
     *
     * @return array{hadir: int[], izin: int[], sakit: int[], alpa: int[]}
     */
    private function absensiBulanIni(int $tahun, int $bulan, ?int $classRoomId): array
    {
        $attendanceQuery = Attendance::whereYear('date', $tahun)->whereMonth('date', $bulan);
        $alpaQuery = Violation::whereYear('date', $tahun)->whereMonth('date', $bulan)->where('type', 'alpa');
        if ($classRoomId) {
            $attendanceQuery->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
            $alpaQuery->whereHas('student', fn ($q) => $q->where('class_room_id', $classRoomId));
        }

        $perHari = $attendanceQuery
            ->selectRaw('DAY(date) as hari, status, COUNT(*) as jumlah')
            ->groupBy('hari', 'status')
            ->get()
            ->groupBy('hari');

        $alpaPerHari = $alpaQuery
            ->selectRaw('DAY(date) as hari, COUNT(*) as jumlah')
            ->groupBy('hari')
            ->pluck('jumlah', 'hari');

        $jumlahHari = (int) cal_days_in_month(CAL_GREGORIAN, $bulan, $tahun);
        $hariRange = range(1, $jumlahHari);

        $hadir = [];
        $izin = [];
        $sakit = [];
        $alpa = [];
        foreach ($hariRange as $h) {
            $rowsHariIni = $perHari->get($h, collect());
            $hadir[] = (int) ($rowsHariIni->firstWhere('status', 'hadir')?->jumlah ?? 0);
            $izin[] = (int) ($rowsHariIni->firstWhere('status', 'izin')?->jumlah ?? 0);
            $sakit[] = (int) ($rowsHariIni->firstWhere('status', 'sakit')?->jumlah ?? 0);
            $alpa[] = (int) ($alpaPerHari[$h] ?? 0);
        }

        return compact('hadir', 'izin', 'sakit', 'alpa');
    }
}
