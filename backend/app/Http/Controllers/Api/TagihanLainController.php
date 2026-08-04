<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\TagihanLain;
use Illuminate\Http\Request;

class TagihanLainController extends Controller
{
    /**
     * Daftar tagihan lain, dengan filter opsional nama tagihan (misal cuma
     * lihat "Study Tour 2026"), kelas, status, dan cari nama/NIS siswa.
     * Beda dari SPP yang wajib pilih bulan/tahun dulu, di sini defaultnya
     * tampilkan SEMUA tagihan (tidak ada filter wajib) karena nama tagihan
     * bisa macam-macam & tidak terikat siklus bulanan.
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'nama_tagihan' => 'nullable|string|max:150',
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'status' => 'nullable|in:belum_bayar,sebagian,lunas',
            'search' => 'nullable|string|max:100',
        ]);

        $query = TagihanLain::with(['student.user', 'student.classRoom']);

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
            'daftar_nama_tagihan' => TagihanLain::select('nama_tagihan')->distinct()->orderBy('nama_tagihan')->pluck('nama_tagihan'),
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
     * siswa aktif, 1 kelas (semua siswa aktif di kelas itu), atau daftar
     * siswa manual. Dipakai kalau ada biaya yang berlaku untuk sekelompok
     * siswa sekaligus (misal study tour 1 angkatan, daftar ulang semua
     * siswa, seragam 1 kelas).
     */
    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'semua_siswa' => 'nullable|boolean',
            'class_room_id' => 'nullable|exists:class_rooms,id',
            'student_ids' => 'nullable|array|min:1',
            'student_ids.*' => 'exists:students,id',
            'nama_tagihan' => 'required|string|max:150',
            'nominal' => 'required|integer|min:0',
            'keterangan' => 'nullable|string|max:500',
        ]);

        if (empty($data['semua_siswa']) && empty($data['class_room_id']) && empty($data['student_ids'])) {
            return response()->json(['message' => 'Pilih semua siswa, kelas, atau siswa tertentu dulu.'], 422);
        }

        if (!empty($data['semua_siswa'])) {
            $studentIds = Student::where('status', 'aktif')->pluck('id');
        } elseif (!empty($data['class_room_id'])) {
            $studentIds = Student::where('class_room_id', $data['class_room_id'])
                ->where('status', 'aktif')->pluck('id');
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

        return $tagihanLain->load(['student.user', 'student.classRoom']);
    }

    public function updateStatus(Request $request, TagihanLain $tagihanLain)
    {
        $data = $request->validate([
            'status' => 'required|in:belum_bayar,lunas',
        ]);

        $tagihanLain->update([
            'status' => $data['status'],
            'jumlah_dibayar' => $data['status'] === 'lunas' ? $tagihanLain->nominal : 0,
            'tanggal_bayar' => $data['status'] === 'lunas' ? now()->toDateString() : null,
            'dicatat_oleh' => $request->user()->id,
        ]);

        return $tagihanLain->load(['student.user', 'student.classRoom']);
    }

    /**
     * Catat pembayaran SEBAGIAN (cicilan) — jumlah yang dibayar ditambahkan
     * ke akumulasi jumlah_dibayar. Status otomatis jadi "lunas" begitu
     * akumulasinya mencapai nominal penuh, atau "sebagian" kalau masih kurang.
     */
    public function bayarSebagian(Request $request, TagihanLain $tagihanLain)
    {
        $sisa = $tagihanLain->nominal - $tagihanLain->jumlah_dibayar;

        if ($sisa <= 0) {
            return response()->json(['message' => 'Tagihan ini sudah lunas.'], 422);
        }

        $data = $request->validate([
            'jumlah' => "required|integer|min:1|max:{$sisa}",
        ], [
            'jumlah.max' => "Jumlah bayar melebihi sisa tagihan (Rp" . number_format($sisa, 0, ',', '.') . ").",
        ]);

        $jumlahBaru = $tagihanLain->jumlah_dibayar + $data['jumlah'];

        $tagihanLain->update([
            'jumlah_dibayar' => $jumlahBaru,
            'status' => $jumlahBaru >= $tagihanLain->nominal ? 'lunas' : 'sebagian',
            'tanggal_bayar' => now()->toDateString(),
            'dicatat_oleh' => $request->user()->id,
        ]);

        return $tagihanLain->load(['student.user', 'student.classRoom']);
    }

    public function destroy(TagihanLain $tagihanLain)
    {
        $tagihanLain->delete();

        return response()->json(['message' => 'Tagihan dihapus.']);
    }

    /**
     * Hapus semua tagihan dengan nama tertentu sekaligus — kebalikan dari
     * storeBulk(), dipakai kalau salah buat massal dan mau ulang dari awal.
     */
    public function destroyByNama(Request $request)
    {
        $data = $request->validate([
            'nama_tagihan' => 'required|string|max:150',
        ]);

        $dihapus = TagihanLain::where('nama_tagihan', $data['nama_tagihan'])->delete();

        return response()->json([
            'message' => "Berhasil menghapus {$dihapus} tagihan \"{$data['nama_tagihan']}\".",
            'dihapus' => $dihapus,
        ]);
    }
}
