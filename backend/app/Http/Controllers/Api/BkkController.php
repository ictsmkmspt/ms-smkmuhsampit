<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Iduka;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\Student;
use App\Models\TracerStudy;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\PenempatanBkkExport;

/**
 * Dashboard Pengurus BKK (Bursa Kerja Khusus) — menu di luar Loker sendiri
 * (yang dipakai bareng lewat JobVacancyController::indexVerifikasi() dkk,
 * lihat routes/api.php grup role:admin,waka_humas,pengurus_bkk). Isinya:
 * ringkasan Beranda, rekap Lamaran Masuk lintas lowongan, Tracer Study,
 * data Mitra & Kerja Sama, dan Laporan Penempatan (format Disnaker).
 */
class BkkController extends Controller
{
    /**
     * Ringkasan buat halaman Beranda BKK.
     */
    public function beranda()
    {
        return [
            'loker_menunggu_verifikasi' => JobVacancy::where('status', 'draf')->count(),
            'loker_aktif'                => JobVacancy::where('status', 'dibuka')->count(),
            'lamaran_baru'                => JobApplication::where('status', 'diajukan')->count(),
            'alumni_belum_tracer'         => Student::where('status', 'lulus')->doesntHave('tracerStudy')->count(),
        ];
    }

    /**
     * Semua loker yang SEDANG TAYANG (status "dibuka") lintas mitra —
     * ditampilkan BKK di bawah daftar verifikasi di menu Loker, supaya BKK
     * bisa lihat lowongan mana saja yang sudah aktif tanpa buka halaman
     * publik /bursakerjakhusus terpisah.
     */
    public function lokerAktif()
    {
        return JobVacancy::tayang()->with('iduka.user', 'jurusan')->withCount('applications')->latest()->get();
    }

    /**
     * Semua lamaran lintas lowongan (beda dari JobApplicationController::
     * indexForVacancy() yang cuma punya 1 IDUKA) — dipakai BKK memantau
     * semua lamaran yang masuk ke seluruh mitra sekaligus.
     */
    public function lamaranMasuk(Request $request)
    {
        $query = JobApplication::with('jobVacancy.iduka', 'student.user', 'student.jurusan')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return $query->get();
    }

    /**
     * Rekap Tracer Study — SEMUA alumni (bukan cuma yang sudah isi), supaya
     * BKK bisa lihat siapa saja yang belum mengisi. Filter opsional
     * ?jurusan_id= dan ?angkatan= (tahun lulus).
     */
    public function tracerRecap(Request $request)
    {
        $query = Student::where('status', 'lulus')->with('user', 'jurusan', 'tracerStudy')->orderByDesc('tanggal_lulus');

        if ($request->filled('jurusan_id')) {
            $query->where('jurusan_id', $request->query('jurusan_id'));
        }
        if ($request->filled('angkatan')) {
            $query->whereYear('tanggal_lulus', $request->query('angkatan'));
        }

        return $query->get();
    }

    /**
     * Detail 1 alumni (bio + riwayat lamaran + tracer study) — dipakai
     * halaman cetak Surat Rekomendasi & Kartu Pencari Kerja.
     */
    public function alumniDetail(Student $student)
    {
        abort_unless($student->status === 'lulus', 404);
        return $student->load('user', 'jurusan', 'classRoom', 'tracerStudy', 'jobApplications.jobVacancy.iduka');
    }

    /**
     * Update data kerja sama 1 IDUKA (jenis kerja sama + dokumen MoU) —
     * TERPISAH dari IdukaController::update() supaya BKK bisa kelola ini
     * tanpa perlu izin ubah data master perusahaan (nama/GPS/dst, itu
     * tetap wewenang Waka Humas lewat Kelola IDUKA).
     */
    public function updateKerjasama(Request $request, Iduka $iduka)
    {
        $data = $request->validate([
            'jenis_kerjasama' => 'required|in:pkl,rekrutmen,keduanya',
            'dokumen_mou'     => 'nullable|file|mimes:pdf|max:5120',
        ]);

        if ($request->hasFile('dokumen_mou')) {
            if ($iduka->dokumen_mou) {
                Storage::disk('public')->delete($iduka->dokumen_mou);
            }
            $data['dokumen_mou'] = $request->file('dokumen_mou')->store('mou', 'public');
        }

        $iduka->update($data);

        return $iduka->fresh();
    }

    /**
     * Ekspor Excel daftar alumni yang sudah diterima kerja lewat sistem
     * ini — format kolom mengikuti kebutuhan laporan penempatan ke
     * Disnaker (Permenaker No. 39/2016).
     */
    public function laporanPenempatan()
    {
        return Excel::download(new PenempatanBkkExport, 'laporan-penempatan-bkk.xlsx');
    }
}
