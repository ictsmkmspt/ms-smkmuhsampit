<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Period;
use App\Models\TahunAjaran;
use Illuminate\Http\Request;

class PeriodController extends Controller
{
    public function index(Request $request)
    {
        $tahunAjaranId = $request->filled('tahun_ajaran_id') ? $request->tahun_ajaran_id : TahunAjaran::aktifId();

        return Period::where('tahun_ajaran_id', $tahunAjaranId)
            ->orderByRaw("FIELD(hari, 'senin','selasa','rabu','kamis','jumat','sabtu')")
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
        $data['tahun_ajaran_id'] = TahunAjaran::aktifId();
        if ($data['tipe'] === 'pelajaran') {
            $data['label_khusus'] = null;
        }

        return response()->json(Period::create($data), 201);
    }

    public function update(Request $request, Period $period)
    {
        $data = $request->validate($this->rules());
        if ($data['tipe'] === 'pelajaran') {
            $data['label_khusus'] = null;
        }

        $period->update($data);

        return $period->fresh();
    }

    public function destroy(Period $period)
    {
        $period->delete();

        return response()->json(['message' => 'Baris jadwal dihapus.']);
    }

    /**
     * Template waktu & jam ke- default mengikuti jadwal master cetak yang
     * biasa dipakai sekolah (Senin diawali Upacara, Selasa-Kamis diawali
     * Sholat Duha, Jumat pola tersendiri dengan blok ekskul). Dipakai
     * sebagai titik awal cepat — hasilnya tetap bisa diedit bebas satu per
     * satu sesudahnya lewat index/store/update/destroy di atas.
     */
    private function templateDefault(): array
    {
        $senin = [
            ['', '06:50', '07:20', 'khusus', 'UPACARA BENDERA', null],
            ['1', '07:20', '07:50', 'pelajaran', null, null],
            ['2', '07:50', '08:20', 'pelajaran', null, null],
            ['3', '08:20', '08:50', 'pelajaran', null, null],
            ['4', '08:50', '09:20', 'pelajaran', null, null],
            ['', '09:20', '09:40', 'khusus', 'ISTIRAHAT PERTAMA', null],
            ['5', '09:40', '10:10', 'pelajaran', null, null],
            ['6', '10:10', '10:40', 'pelajaran', null, null],
            ['7', '10:40', '11:10', 'pelajaran', null, null],
            ['', '11:10', '11:50', 'khusus', 'SHOLAT DZUHUR BERJAMAAH', null],
            ['', '11:50', '12:20', 'khusus', 'ISTIRAHAT KEDUA', null],
            ['8', '12:20', '13:00', 'khusus', "KOKURIKULER - LITERASI AL-QUR'AN", '#D4EACB'],
            ['9', '13:00', '13:30', 'pelajaran', null, null],
            ['10', '13:30', '14:00', 'pelajaran', null, null],
            ['11', '14:00', '14:30', 'pelajaran', null, null],
            ['12', '14:30', '15:00', 'pelajaran', null, null],
            ['', '15:00', '15:05', 'khusus', 'PULANG', null],
        ];

        $selasaRabuKamis = $senin;
        $selasaRabuKamis[0] = ['0', '06:50', '07:20', 'khusus', 'SHOLAT DUHA', null];

        $jumat = [
            ['', '06:50', '07:20', 'khusus', 'SENAM PAGI', null],
            ['1-3', '07:20', '08:50', 'khusus', 'EKSKUL WAJIB TERJADWAL (KEMUHAMMADIYAHAN, HW DAN TS)', '#D4EACB'],
            ['', '08:50', '09:10', 'khusus', 'ISTIRAHAT', null],
            ['4-6', '09:10', '10:30', 'khusus', 'PENGEMBANGAN DIRI: EKSKUL PILIHAN', '#D4EACB'],
            ['', '10:30', '10:35', 'khusus', 'PULANG', null],
        ];

        return [
            'senin' => $senin,
            'selasa' => $selasaRabuKamis,
            'rabu' => $selasaRabuKamis,
            'kamis' => $selasaRabuKamis,
            'jumat' => $jumat,
        ];
    }

    /**
     * Timpa seluruh baris jam & slot tahun ajaran aktif dengan template
     * default di atas — isian mapel per kelas (schedules) yang menempel di
     * baris lama ikut terhapus (cascade), makanya endpoint ini butuh
     * konfirmasi eksplisit dari frontend sebelum dipanggil.
     */
    public function seedDefault()
    {
        $tahunAjaranId = TahunAjaran::aktifId();
        if (!$tahunAjaranId) {
            return response()->json(['message' => 'Tidak ada tahun ajaran aktif.'], 422);
        }

        Period::where('tahun_ajaran_id', $tahunAjaranId)->delete();

        foreach ($this->templateDefault() as $hari => $baris) {
            foreach ($baris as [$jamKe, $mulai, $selesai, $tipe, $label, $warna]) {
                Period::create([
                    'tahun_ajaran_id' => $tahunAjaranId,
                    'hari' => $hari,
                    'jam_ke' => $jamKe !== '' ? $jamKe : null,
                    'waktu_mulai' => $mulai,
                    'waktu_selesai' => $selesai,
                    'tipe' => $tipe,
                    'label_khusus' => $label,
                    'warna' => $warna,
                ]);
            }
        }

        return response()->json(['message' => 'Template jam & slot default berhasil dimuat.']);
    }
}
