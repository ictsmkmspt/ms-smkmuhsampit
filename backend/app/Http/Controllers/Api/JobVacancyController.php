<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\Student;
use App\Models\User;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Lowongan kerja (bagian fitur BKK). Alurnya: IDUKA pasang lowongan (status
 * "draf") lewat *Iduka() di bawah -> Pengurus BKK verifikasi lewat
 * *Verifikasi()/setujui()/tolak() (setuju jadi "dibuka" & tayang publik,
 * atau tolak balik ke "draf" dengan catatan revisi) -> tayang di halaman
 * publik lewat publicIndex()/publicShow().
 */
class JobVacancyController extends Controller
{
    /**
     * Daftar lowongan yang TAYANG PUBLIK (status dibuka, belum lewat tanggal
     * tutup) — dipakai halaman publik /bursakerjakhusus, TIDAK butuh login sama
     * sekali. Filter opsional ?jurusan_id= dan ?q= (cari di posisi/nama
     * perusahaan).
     */
    public function publicIndex(Request $request)
    {
        $query = JobVacancy::with('iduka', 'jurusan')->tayang()->latest();

        if ($request->filled('jurusan_id')) {
            $query->where('jurusan_id', $request->query('jurusan_id'));
        }
        if ($request->filled('q')) {
            $cari = '%' . $request->query('q') . '%';
            $query->where(function ($sub) use ($cari) {
                $sub->where('posisi', 'like', $cari)
                    ->orWhereHas('iduka', fn ($i) => $i->where('nama_perusahaan', 'like', $cari));
            });
        }

        return $query->paginate(12);
    }

    /**
     * Statistik ringkas buat hero halaman publik /bursakerjakhusus.
     */
    public function publicStats()
    {
        return [
            'lowongan_aktif'     => JobVacancy::tayang()->count(),
            'mitra_industri'     => JobVacancy::tayang()->distinct('iduka_id')->count('iduka_id'),
            'alumni_tersalurkan' => JobApplication::where('status', 'diterima')->count(),
        ];
    }

    /**
     * Detail 1 lowongan, publik juga — dibiarkan bisa diakses walau
     * statusnya sudah "ditutup" (supaya link yang sudah dibagikan tidak
     * mendadak 404), tapi TIDAK untuk yang masih "draf" (belum disetujui).
     */
    public function publicShow(JobVacancy $jobVacancy)
    {
        abort_if($jobVacancy->status === 'draf', 404);
        return $jobVacancy->load('iduka', 'jurusan');
    }

    /**
     * Daftar lowongan milik akun IDUKA yang sedang login (semua status).
     */
    public function indexIduka(Request $request)
    {
        return JobVacancy::with('jurusan')
            ->withCount('applications')
            ->where('iduka_id', $request->user()->iduka_id)
            ->latest()
            ->get();
    }

    public function storeIduka(Request $request)
    {
        $data = $request->validate([
            'posisi'         => 'required|string|max:150',
            'deskripsi'      => 'required|string',
            'kualifikasi'    => 'nullable|string',
            'gaji'           => 'nullable|string|max:100',
            'jurusan_id'     => 'nullable|exists:jurusans,id',
            'kuota'          => 'nullable|integer|min:1',
            'tanggal_tutup'  => 'nullable|date',
            'foto_brosur'    => 'nullable|image|max:2048',
        ]);

        $data['iduka_id'] = $request->user()->iduka_id;
        $data['status'] = 'draf';

        if ($request->hasFile('foto_brosur')) {
            $data['foto_brosur'] = $request->file('foto_brosur')->store('lowongan', 'public');
        }

        $lowongan = JobVacancy::create($data);

        NotificationDispatcher::sendMany(
            User::where('role', 'pengurus_bkk')->get(),
            'lowongan',
            'Lowongan baru menunggu verifikasi',
            "{$request->user()->name} memasang lowongan \"{$lowongan->posisi}\".",
            '/bkk'
        );

        return response()->json($lowongan->fresh()->load('jurusan'), 201);
    }

    /**
     * IDUKA edit lowongan miliknya sendiri. Kalau statusnya "dibuka" dan
     * datanya diubah, otomatis dikembalikan ke "draf" — perubahan wajib
     * diverifikasi ulang supaya info yang sudah disetujui tidak diam-diam
     * diganti.
     */
    public function updateIduka(Request $request, JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->iduka_id === $request->user()->iduka_id, 403);

        $data = $request->validate([
            'posisi'         => 'sometimes|string|max:150',
            'deskripsi'      => 'sometimes|string',
            'kualifikasi'    => 'nullable|string',
            'gaji'           => 'nullable|string|max:100',
            'jurusan_id'     => 'nullable|exists:jurusans,id',
            'kuota'          => 'nullable|integer|min:1',
            'tanggal_tutup'  => 'nullable|date',
            'foto_brosur'    => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('foto_brosur')) {
            if ($jobVacancy->foto_brosur) {
                Storage::disk('public')->delete($jobVacancy->foto_brosur);
            }
            $data['foto_brosur'] = $request->file('foto_brosur')->store('lowongan', 'public');
        }

        if ($jobVacancy->status === 'dibuka') {
            $data['status'] = 'draf';
        }
        $data['catatan_revisi'] = null;

        $jobVacancy->update($data);

        return $jobVacancy->fresh()->load('jurusan');
    }

    /**
     * IDUKA tutup lowongan miliknya sendiri (mis. kuota sudah penuh) —
     * terpisah dari update() supaya tidak perlu isi ulang form cuma untuk
     * ganti status.
     */
    public function tutupIduka(Request $request, JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->iduka_id === $request->user()->iduka_id, 403);
        abort_unless($jobVacancy->status === 'dibuka', 422, 'Cuma lowongan yang sedang dibuka yang bisa ditutup.');

        $jobVacancy->update(['status' => 'ditutup']);
        $jobVacancy->tolakSisaLamaran();

        return $jobVacancy->fresh();
    }

    public function destroyIduka(Request $request, JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->iduka_id === $request->user()->iduka_id, 403);

        if ($jobVacancy->foto_brosur) {
            Storage::disk('public')->delete($jobVacancy->foto_brosur);
        }
        $jobVacancy->delete();

        return response()->json(['message' => 'Lowongan dihapus.']);
    }

    /**
     * Daftar lowongan berstatus "draf" (menunggu diverifikasi) — dipakai
     * admin/Waka Humas.
     */
    public function indexVerifikasi()
    {
        return JobVacancy::with('iduka', 'jurusan')
            ->where('status', 'draf')
            ->oldest()
            ->get();
    }

    /**
     * Setujui lowongan — jadi tayang publik, lalu notif ke semua alumni
     * (kalau ada jurusan_id_dicari, cuma alumni jurusan itu; kalau tidak
     * diisi, semua alumni).
     */
    public function setujui(JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->status === 'draf', 422, 'Lowongan ini sudah diproses.');

        $jobVacancy->update(['status' => 'dibuka', 'catatan_revisi' => null]);
        $jobVacancy->load('iduka');

        $alumniQuery = Student::where('status', 'lulus')->with('user');
        if ($jobVacancy->jurusan_id) {
            $alumniQuery->where('jurusan_id', $jobVacancy->jurusan_id);
        }
        $penerima = $alumniQuery->get()->pluck('user')->filter();

        NotificationDispatcher::sendMany(
            $penerima,
            'lowongan',
            'Lowongan kerja baru',
            "{$jobVacancy->iduka->nama_perusahaan} membuka lowongan {$jobVacancy->posisi}.",
            '/siswa'
        );

        return $jobVacancy->fresh()->load('iduka', 'jurusan');
    }

    /**
     * Tolak lowongan — dikembalikan ke IDUKA untuk direvisi (tetap status
     * "draf", cuma diisi catatan_revisi), bukan status terpisah "ditolak" —
     * supaya IDUKA cukup edit & otomatis masuk antrean verifikasi lagi.
     */
    public function tolak(Request $request, JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->status === 'draf', 422, 'Lowongan ini sudah diproses.');

        $data = $request->validate(['catatan_revisi' => 'required|string|max:500']);
        $jobVacancy->update(['catatan_revisi' => $data['catatan_revisi']]);
        $jobVacancy->load('iduka');

        if ($jobVacancy->iduka->user) {
            NotificationDispatcher::send(
                $jobVacancy->iduka->user,
                'lowongan',
                'Lowongan perlu direvisi',
                "Lowongan \"{$jobVacancy->posisi}\" perlu direvisi: {$data['catatan_revisi']}",
                '/iduka'
            );
        }

        return $jobVacancy->fresh()->load('iduka', 'jurusan');
    }

    /**
     * Admin/Waka Humas paksa tutup lowongan yang sedang tayang (mis.
     * dilaporkan bermasalah) — beda dari tutupIduka() yang cuma untuk
     * pemilik lowongan sendiri.
     */
    public function tutupPaksa(JobVacancy $jobVacancy)
    {
        abort_unless($jobVacancy->status === 'dibuka', 422, 'Cuma lowongan yang sedang dibuka yang bisa ditutup.');
        $jobVacancy->update(['status' => 'ditutup']);
        $jobVacancy->tolakSisaLamaran();
        return $jobVacancy->fresh();
    }
}
