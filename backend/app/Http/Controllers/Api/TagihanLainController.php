<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TagihanLain;
use App\Models\TagihanLainPembayaran;
use App\Models\TahunAjaran;
use App\Services\NotificationDispatcher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TagihanLainController extends Controller
{
    /**
     * Satu-satunya jalan mengubah jumlah_dibayar — selalu lewat baris
     * riwayat pembayaran dulu (supaya laporan kas per-bulan akurat &
     * cicilan lintas bulan tidak saling menimpa), baru jumlah_dibayar /
     * status / tanggal_bayar di induk di-cache ulang dari total riwayatnya.
     */
    private function catatPembayaranTagihanLain(TagihanLain $tagihanLain, int $jumlah, string $tanggal, ?int $dicatatOleh, ?string $keterangan = null): TagihanLain
    {
        $tagihanLain->pembayaran()->create([
            'jumlah' => $jumlah,
            'tanggal_bayar' => $tanggal,
            'dicatat_oleh' => $dicatatOleh,
            'keterangan' => $keterangan,
        ]);

        $totalDibayar = (int) $tagihanLain->pembayaran()->sum('jumlah');
        $statusBaru = $totalDibayar >= $tagihanLain->nominal ? 'lunas' : 'sebagian';
        $tagihanLain->update([
            'jumlah_dibayar' => $totalDibayar,
            'status' => $statusBaru,
            'tanggal_bayar' => $tanggal,
            'dicatat_oleh' => $dicatatOleh,
        ]);

        $judul = $statusBaru === 'lunas' ? 'Pembayaran tagihan lunas' : 'Pembayaran tagihan diterima (sebagian)';
        $pesan = "{$tagihanLain->nama_tagihan} — Rp" . number_format($jumlah, 0, ',', '.') . ' diterima. ' .
            ($statusBaru === 'lunas' ? 'Tagihan ini sudah lunas.' : 'Tagihan ini masih sebagian, sisa Rp' . number_format($tagihanLain->nominal - $totalDibayar, 0, ',', '.') . '.');

        if ($tagihanLain->student->user) {
            NotificationDispatcher::send($tagihanLain->student->user, 'tagihan_lain', $judul, $pesan, '/siswa');
            NotificationDispatcher::sendMany($tagihanLain->student->parents, 'tagihan_lain', $judul, "{$tagihanLain->student->user->name} — {$pesan}", '/wali');
        }

        return $tagihanLain;
    }

    /**
     * Daftar tagihan lain, dengan filter opsional nama tagihan (misal cuma
     * lihat "Study Tour 2026"), kelas, status, dan cari nama/NIS siswa.
     * Terikat tahun ajaran seperti data lain di aplikasi ini: default ke
     * tahun ajaran aktif (supaya tagihan tahun lalu tidak terus menumpuk
     * campur dengan tahun berjalan), kecuali tahun_ajaran_id dikirim
     * eksplisit lewat tombol pemilih tahun ajaran di layar TU. Daftar nama
     * tagihan buat dropdown filter ikut disaring ke tahun yang sama, biar
     * tidak penuh nama tagihan tahun-tahun lama yang sudah tidak relevan.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'nama_tagihan' => 'nullable|string|max:150',
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'status' => 'nullable|in:belum_bayar,sebagian,lunas',
            'search' => 'nullable|string|max:100',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajarans,id',
        ]);

        $tahunAjaranId = $data['tahun_ajaran_id'] ?? TahunAjaran::aktifId();

        $query = TagihanLain::with(['student.user', 'student.classRoom'])
            ->where('tahun_ajaran_id', $tahunAjaranId);

        if (!empty($data['nama_tagihan'])) {
            $query->where('nama_tagihan', $data['nama_tagihan']);
        }

        if (!empty($data['status'])) {
            $query->where('status', $data['status']);
        }

        if (!empty($data['class_room_id'])) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $data['class_room_id']));
        }

        if (!empty($data['search'])) {
            $search = $data['search'];
            $query->whereHas('student', function ($q) use ($search) {
                $q->where('nis', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }

        $tagihan = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $tagihan,
            'daftar_nama_tagihan' => TagihanLain::where('tahun_ajaran_id', $tahunAjaranId)
                ->select('nama_tagihan')->distinct()->orderBy('nama_tagihan')->pluck('nama_tagihan'),
        ]);
    }

    /**
     * Riwayat tagihan lain 1 siswa (semua nama tagihan) — dipakai TU untuk
     * cari siswa & bayar langsung, sama seperti panel riwayat SPP.
     */
    public function byStudent($studentId)
    {
        $student = Student::with(['user', 'classRoom'])->findOrFail($studentId);
        $tagihan = TagihanLain::where('student_id', $studentId)->orderByDesc('created_at')->get();

        return response()->json([
            'student' => $student,
            'tagihan' => $tagihan,
        ]);
    }

    public function show(TagihanLain $tagihanLain)
    {
        return $tagihanLain->load(['student.user', 'student.classRoom', 'dicatatOleh']);
    }

    /**
     * Buat 1 tagihan untuk 1 siswa.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'nama_tagihan' => 'required|string|max:150',
            'nominal' => 'required|integer|min:0',
            'keterangan' => 'nullable|string|max:500',
        ]);

        $tagihan = TagihanLain::create([
            'student_id' => $data['student_id'],
            'nama_tagihan' => trim($data['nama_tagihan']),
            'nominal' => $data['nominal'],
            'keterangan' => $data['keterangan'] ?? null,
            'status' => 'belum_bayar',
        ]);

        return response()->json($tagihan->load(['student.user', 'student.classRoom']), 201);
    }

    /**
     * Buat 1 tagihan yang sama sekaligus untuk BANYAK siswa — pilih SEMUA
     * siswa aktif, 1 atau beberapa kelas sekaligus (semua siswa aktif di
     * kelas-kelas itu, mis. XI TKJ + XI MP + X TKJ dalam 1 aksi), atau
     * daftar siswa manual. Dipakai kalau ada biaya yang berlaku untuk
     * sekelompok siswa sekaligus (misal study tour beberapa kelas,
     * daftar ulang semua siswa, seragam 1 kelas). jenis_kelamin opsional
     * menyaring lebih lanjut hasil "semua siswa"/kelas — dipakai kalau
     * nominal beda antara siswa laki-laki & perempuan (mis. seragam),
     * jadi TU tinggal buat 2 tagihan terpisah dengan nominal masing-masing.
     * Tidak berlaku untuk daftar siswa manual (student_ids) karena
     * pilihannya sudah pasti/eksplisit.
     */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'semua_siswa' => 'nullable|boolean',
            'class_room_ids' => 'nullable|array|min:1',
            'class_room_ids.*' => 'exists:class_rooms,id',
            'student_ids' => 'nullable|array|min:1',
            'student_ids.*' => 'exists:students,id',
            'jenis_kelamin' => 'nullable|in:L,P',
            'nama_tagihan' => 'required|string|max:150',
            'nominal' => 'required|integer|min:0',
            'keterangan' => 'nullable|string|max:500',
        ]);

        if (empty($data['semua_siswa']) && empty($data['class_room_ids']) && empty($data['student_ids'])) {
            return response()->json(['message' => 'Pilih semua siswa, kelas, atau siswa tertentu dulu.'], 422);
        }

        if (!empty($data['semua_siswa'])) {
            $query = Student::where('status', 'aktif');
            if (!empty($data['jenis_kelamin'])) {
                $query->where('jenis_kelamin', $data['jenis_kelamin']);
            }
            $studentIds = $query->pluck('id');
        } elseif (!empty($data['class_room_ids'])) {
            $query = Student::whereIn('class_room_id', $data['class_room_ids'])->where('status', 'aktif');
            if (!empty($data['jenis_kelamin'])) {
                $query->where('jenis_kelamin', $data['jenis_kelamin']);
            }
            $studentIds = $query->pluck('id');
        } else {
            $studentIds = collect($data['student_ids']);
        }

        $namaTagihan = trim($data['nama_tagihan']);
        $dibuat = 0;

        foreach ($studentIds as $studentId) {
            TagihanLain::create([
                'student_id' => $studentId,
                'nama_tagihan' => $namaTagihan,
                'nominal' => $data['nominal'],
                'keterangan' => $data['keterangan'] ?? null,
                'status' => 'belum_bayar',
            ]);
            $dibuat++;
        }

        return response()->json([
            'message' => "Berhasil membuat tagihan \"{$namaTagihan}\" untuk {$dibuat} siswa.",
            'dibuat' => $dibuat,
        ], 201);
    }

    /**
     * Ubah nama/nominal/keterangan 1 tagihan (dipakai kalau salah input).
     */
    public function update(Request $request, TagihanLain $tagihanLain)
    {
        $data = $request->validate([
            'nama_tagihan' => 'sometimes|string|max:150',
            'nominal' => 'sometimes|integer|min:0',
            'keterangan' => 'nullable|string|max:500',
        ]);

        if (isset($data['nama_tagihan'])) {
            $data['nama_tagihan'] = trim($data['nama_tagihan']);
        }

        $tagihanLain->update($data);

        // Status HARUS dihitung ulang terhadap jumlah_dibayar yang sudah
        // ada kalau nominal ikut berubah — supaya tidak ada tagihan yang
        // nominalnya dinaikkan di atas status "lunas" lama tapi sisanya
        // diam-diam hilang dari laporan, atau diturunkan di bawah
        // jumlah_dibayar bikin "sisa" tampil negatif di UI.
        if (isset($data['nominal'])) {
            $tagihanLain->update(['status' => $tagihanLain->jumlah_dibayar >= $tagihanLain->nominal
                ? 'lunas'
                : ($tagihanLain->jumlah_dibayar > 0 ? 'sebagian' : 'belum_bayar')]);
        }

        return $tagihanLain->fresh(['student.user', 'student.classRoom']);
    }

    public function updateStatus(Request $request, TagihanLain $tagihanLain)
    {
        $data = $request->validate([
            'status' => 'required|in:belum_bayar,lunas',
        ]);

        return DB::transaction(function () use ($data, $tagihanLain, $request) {
            $tagihanLain = TagihanLain::lockForUpdate()->findOrFail($tagihanLain->id);

            if ($data['status'] === 'lunas') {
                $sisa = $tagihanLain->nominal - $tagihanLain->jumlah_dibayar;
                if ($sisa > 0) {
                    $this->catatPembayaranTagihanLain($tagihanLain, $sisa, now()->toDateString(), $request->user()->id, 'Ditandai lunas manual');
                }
            } else {
                // "Batalkan" — kalau "lunas"-nya tercapai lewat top-up
                // otomatis (tombol Tandai Lunas menambah selisih sebagai 1
                // baris riwayat berketerangan "Ditandai lunas manual"),
                // batalkan berarti menghapus KEMBALI baris top-up itu, lalu
                // jumlah_dibayar dihitung ulang dari riwayat yang tersisa.
                // Sebelumnya cuma status yang diganti tanpa menyentuh
                // jumlah_dibayar — hasilnya data ganjil: status "Sebagian"
                // padahal jumlah_dibayar sudah = nominal (sisa Rp0).
                $tagihanLain->refresh();
                $topUp = $tagihanLain->pembayaran()->where('keterangan', 'Ditandai lunas manual')->latest()->first();

                if ($topUp) {
                    $topUp->delete();
                    $tagihanLain->refresh();
                    $totalDibayar = (int) $tagihanLain->pembayaran()->sum('jumlah');
                    $tagihanLain->update([
                        'jumlah_dibayar' => $totalDibayar,
                        'status' => $totalDibayar > 0 ? 'sebagian' : 'belum_bayar',
                        'tanggal_bayar' => $tagihanLain->pembayaran()->latest('tanggal_bayar')->value('tanggal_bayar'),
                        'dicatat_oleh' => $request->user()->id,
                    ]);
                } elseif ($tagihanLain->pembayaran()->count() === 0) {
                    // Data lama dari sebelum riwayat pembayaran (ledger) ada —
                    // jumlah_dibayar/status di-set langsung tanpa baris riwayat
                    // sama sekali, jadi tidak ada apa pun buat dihapus lewat
                    // Riwayat. Karena riwayatnya memang kosong (bukan ada
                    // cicilan sungguhan yang tersembunyi), aman untuk langsung
                    // di-reset ke Belum Bayar.
                    $tagihanLain->update([
                        'jumlah_dibayar' => 0,
                        'status' => 'belum_bayar',
                        'tanggal_bayar' => null,
                        'dicatat_oleh' => $request->user()->id,
                    ]);
                } else {
                    // Lunas tercapai murni dari cicilan asli (bukan lewat
                    // tombol Tandai Lunas) — tidak ada top-up buatan yang
                    // bisa dihapus, jadi tidak bisa "dibatalkan" begitu saja
                    // tanpa menghapus pembayaran sungguhan.
                    return response()->json([
                        'message' => 'Tagihan ini lunas dari cicilan asli (bukan tombol Tandai Lunas), tidak bisa dibatalkan langsung. Hapus/koreksi riwayat pembayarannya manual kalau memang perlu.',
                    ], 422);
                }
            }

            return $tagihanLain->fresh(['student.user', 'student.classRoom']);
        });
    }

    /**
     * Catat pembayaran SEBAGIAN (cicilan) — jumlah yang dibayar ditambahkan
     * ke akumulasi jumlah_dibayar (lewat riwayat pembayaran, bukan
     * menimpa). Status otomatis jadi "lunas" begitu akumulasinya mencapai
     * nominal penuh, atau "sebagian" kalau masih kurang.
     */
    public function bayarSebagian(Request $request, TagihanLain $tagihanLain)
    {
        return DB::transaction(function () use ($request, $tagihanLain) {
            $tagihanLain = TagihanLain::lockForUpdate()->findOrFail($tagihanLain->id);
            $sisa = $tagihanLain->nominal - $tagihanLain->jumlah_dibayar;

            if ($sisa <= 0) {
                return response()->json(['message' => 'Tagihan ini sudah lunas.'], 422);
            }

            $data = $request->validate([
                'jumlah' => "required|integer|min:1|max:{$sisa}",
            ], [
                'jumlah.max' => "Jumlah bayar melebihi sisa tagihan (Rp" . number_format($sisa, 0, ',', '.') . ").",
            ]);

            $this->catatPembayaranTagihanLain($tagihanLain, $data['jumlah'], now()->toDateString(), $request->user()->id);

            return $tagihanLain->fresh(['student.user', 'student.classRoom']);
        });
    }

    /**
     * Riwayat baris pembayaran (cicilan) 1 tagihan — dipakai TU untuk
     * mengoreksi kalau ada baris yang salah input jumlahnya (lihat
     * hapusPembayaran()).
     */
    public function riwayatPembayaran(TagihanLain $tagihanLain)
    {
        return $tagihanLain->pembayaran()->with('dicatatOleh')->orderByDesc('tanggal_bayar')->orderByDesc('id')->get();
    }

    /**
     * Hapus 1 baris cicilan yang salah input — dipakai TU untuk koreksi.
     * jumlah_dibayar/status/tanggal_bayar di induk dihitung ulang dari
     * sisa riwayat yang ada, pola sama seperti catatPembayaranTagihanLain()
     * tapi arah sebaliknya (kurangi, bukan tambah).
     */
    public function hapusPembayaran(TagihanLain $tagihanLain, TagihanLainPembayaran $pembayaran)
    {
        if ($pembayaran->tagihan_lain_id !== $tagihanLain->id) {
            abort(404);
        }

        return DB::transaction(function () use ($tagihanLain, $pembayaran) {
            $tagihanLain = TagihanLain::lockForUpdate()->findOrFail($tagihanLain->id);
            $pembayaran->delete();

            $totalDibayar = (int) $tagihanLain->pembayaran()->sum('jumlah');
            $tagihanLain->update([
                'jumlah_dibayar' => $totalDibayar,
                'status' => $totalDibayar >= $tagihanLain->nominal ? 'lunas' : ($totalDibayar > 0 ? 'sebagian' : 'belum_bayar'),
                'tanggal_bayar' => $tagihanLain->pembayaran()->latest('tanggal_bayar')->value('tanggal_bayar'),
            ]);

            return $tagihanLain->fresh(['student.user', 'student.classRoom']);
        });
    }

    public function destroy(TagihanLain $tagihanLain)
    {
        $tagihanLain->delete();

        return response()->json(['message' => 'Tagihan dihapus.']);
    }

    /**
     * Hapus semua tagihan dengan nama tertentu sekaligus — kebalikan dari
     * storeBulk(), dipakai kalau salah buat massal dan mau ulang dari awal.
     * Dibatasi ke 1 tahun ajaran (default aktif, atau tahun yang sedang
     * ditampilkan lewat tombol pemilih tahun ajaran) — supaya tidak
     * kebablasan menghapus tagihan tahun lain yang kebetulan nama-nya sama
     * (mis. "Seragam" dipakai ulang tiap tahun). Sengaja HANYA menghapus
     * yang masih 'belum_bayar' — sebelumnya menghapus SEMUA tanpa pandang
     * status, jadi ikut menghapus tagihan yang sudah lunas/dicicil
     * beserta bukti pembayarannya.
     */
    public function destroyByNama(Request $request)
    {
        $data = $request->validate([
            'nama_tagihan' => 'required|string|max:150',
            'tahun_ajaran_id' => 'nullable|exists:tahun_ajarans,id',
            'class_room_id' => 'nullable|exists:class_rooms,id',
        ]);

        $tahunAjaranId = $data['tahun_ajaran_id'] ?? TahunAjaran::aktifId();

        $query = TagihanLain::where('nama_tagihan', $data['nama_tagihan'])
            ->where('tahun_ajaran_id', $tahunAjaranId)
            ->where('status', 'belum_bayar');

        if (!empty($data['class_room_id'])) {
            $query->whereHas('student', fn ($q) => $q->where('class_room_id', $data['class_room_id']));
        }

        $dihapus = $query->delete();

        return response()->json([
            'message' => "Berhasil menghapus {$dihapus} tagihan \"{$data['nama_tagihan']}\" yang belum dibayar (tagihan yang sudah lunas/dicicil TIDAK ikut terhapus).",
            'dihapus' => $dihapus,
        ]);
    }
}
