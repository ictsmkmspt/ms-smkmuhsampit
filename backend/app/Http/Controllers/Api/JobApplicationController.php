<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Lamaran alumni ke lowongan kerja (bagian fitur BKK). Melamar cuma boleh
 * alumni (Student::status === 'lulus') — siswa yang masih aktif sekolah
 * TIDAK ditawari lowongan kerja dulu, dicek manual di store() karena role
 * "siswa" dipakai bareng siswa aktif & alumni (bukan role terpisah).
 */
class JobApplicationController extends Controller
{
    private function alumniAtauTolak(Request $request)
    {
        $student = $request->user()->student;
        abort_unless($student && $student->status === 'lulus', 403, 'Fitur ini khusus alumni.');
        return $student;
    }

    /**
     * Riwayat lamaran milik alumni yang sedang login.
     */
    public function myApplications(Request $request)
    {
        $student = $this->alumniAtauTolak($request);

        return JobApplication::with('jobVacancy.iduka.user')
            ->where('student_id', $student->id)
            ->latest()
            ->get();
    }

    /**
     * Alumni melamar 1 lowongan — cuma boleh yang statusnya "dibuka", dan
     * cuma 1x per lowongan (dicegah unique constraint di migrasi, tapi
     * dicek dulu di sini supaya pesan errornya lebih jelas daripada error
     * SQL mentah).
     */
    public function store(Request $request, JobVacancy $jobVacancy)
    {
        $student = $this->alumniAtauTolak($request);

        abort_unless($student->biodata_lengkap, 422, 'Lengkapi biodata kamu dulu di menu Biodata sebelum melamar.');
        abort_unless($jobVacancy->status === 'dibuka', 422, 'Lowongan ini sudah tidak menerima lamaran.');

        if (JobApplication::where('job_vacancy_id', $jobVacancy->id)->where('student_id', $student->id)->exists()) {
            return response()->json(['message' => 'Kamu sudah melamar lowongan ini sebelumnya.'], 422);
        }

        $application = JobApplication::create([
            'job_vacancy_id' => $jobVacancy->id,
            'student_id'     => $student->id,
            'status'         => 'diajukan',
        ]);

        $jobVacancy->load('iduka');
        if ($jobVacancy->iduka->user) {
            NotificationDispatcher::send(
                $jobVacancy->iduka->user,
                'lowongan',
                'Lamaran baru masuk',
                "{$student->user->name} melamar posisi {$jobVacancy->posisi}.",
                '/iduka'
            );
        }
        NotificationDispatcher::sendMany(
            User::where('role', 'pengurus_bkk')->get(),
            'lowongan',
            'Lamaran baru masuk',
            "{$student->user->name} melamar posisi {$jobVacancy->posisi} di {$jobVacancy->iduka->nama_perusahaan}.",
            '/bkk'
        );

        return response()->json($application->load('jobVacancy.iduka'), 201);
    }

    /**
     * Alumni batalkan lamaran sendiri — cuma boleh selama masih "diajukan"
     * (belum diputuskan IDUKA).
     */
    public function destroy(Request $request, JobApplication $jobApplication)
    {
        $student = $this->alumniAtauTolak($request);
        abort_unless($jobApplication->student_id === $student->id, 403);
        abort_unless($jobApplication->status === 'diajukan', 422, 'Lamaran yang sudah diproses tidak bisa dibatalkan.');

        $jobApplication->delete();

        return response()->json(['message' => 'Lamaran dibatalkan.']);
    }

    /**
     * Daftar pelamar 1 lowongan milik IDUKA yang sedang login.
     */
    public function indexForVacancy(Request $request, JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->iduka_id === $request->user()->iduka_id, 403);

        return $jobVacancy->applications()->with('student.user', 'student.jurusan')->latest()->get();
    }

    /**
     * Detail 1 pelamar milik IDUKA yang sedang login — dipakai halaman
     * biodata pelamar (dibuka tab baru dari tombol "Detail" di
     * PelamarModal, LowonganTab.jsx), supaya IDUKA gampang baca biodata
     * lengkap tanpa terbatas ruang popup.
     */
    public function showForIduka(Request $request, JobApplication $jobApplication)
    {
        $jobApplication->load('jobVacancy');
        abort_unless($jobApplication->jobVacancy->iduka_id === $request->user()->iduka_id, 403);

        return $jobApplication->load('student.user', 'student.jurusan', 'student.classRoom', 'jobVacancy');
    }

    /**
     * IDUKA terima/tolak 1 pelamar.
     */
    public function updateStatus(Request $request, JobApplication $jobApplication)
    {
        $jobApplication->load('jobVacancy');
        abort_unless($jobApplication->jobVacancy->iduka_id === $request->user()->iduka_id, 403);

        return $this->prosesStatus($request, $jobApplication);
    }

    /**
     * Pengurus BKK juga boleh terima/tolak pelamar (bukan cuma IDUKA) —
     * sesuai rancangan alur "IDUKA/BKK ubah status sesuai proses
     * rekrutmen", jadi TIDAK dicek kepemilikan iduka_id seperti
     * updateStatus() di atas.
     */
    public function updateStatusAsBkk(Request $request, JobApplication $jobApplication)
    {
        return $this->prosesStatus($request, $jobApplication);
    }

    private function prosesStatus(Request $request, JobApplication $jobApplication)
    {
        $jobApplication->load('jobVacancy', 'student.user');

        $data = $request->validate([
            'status'  => ['required', Rule::in(['diterima', 'ditolak'])],
            'catatan' => 'nullable|string|max:500',
        ]);

        $jobApplication->update($data);

        if ($jobApplication->student->user) {
            $pesan = $data['status'] === 'diterima'
                ? "Selamat! Lamaran kamu untuk posisi {$jobApplication->jobVacancy->posisi} diterima."
                : "Lamaran kamu untuk posisi {$jobApplication->jobVacancy->posisi} belum berhasil kali ini.";
            NotificationDispatcher::send($jobApplication->student->user, 'lowongan', 'Status lamaran diperbarui', $pesan, '/siswa');
        }

        return $jobApplication->fresh()->load('student.user');
    }
}
