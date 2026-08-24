# Daftar Notifikasi In-App per Role

Daftar ini mencatat semua trigger notifikasi otomatis yang sudah aktif di sistem (kategori, judul, dan kapan dikirim), dikelompokkan per role penerima. Notifikasi ini cuma mencatat kejadian MULAI SAAT fitur/trigger-nya dibuat — tidak retroaktif ke data lama.

## Siswa

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `prestasi` | Prestasi baru dicatat | Guru mencatat prestasi baru untuk siswa |
| `pelanggaran` | Pelanggaran tercatat | Guru/BK mencatat pelanggaran manual |
| `absensi` | Alpa tercatat | Siswa tercatat alpa (tanpa keterangan) |
| `sanksi` | Poin menembus ambang sanksi | Total poin pelanggaran siswa menembus ambang batas Sanksi Bertingkat |
| `bk` | Kasus BK baru dicatat | Guru BK mencatat kasus baru untuk siswa |
| `bk` | Kasus BK selesai | Kasus BK siswa ditandai selesai |
| `spp` | Pembayaran SPP lunas / diterima (sebagian) | Pembayaran SPP tercatat (lunas atau sebagian) |
| `tagihan_lain` | Pembayaran tagihan lunas / diterima (sebagian) | Pembayaran tagihan lain tercatat |
| `nilai` | Nilai baru | Guru menyimpan nilai akademik baru |
| `nilai` | Nilai Tahsin baru | Guru mencatat setoran Tahsin baru |
| `nilai` | Nilai Tahfidz baru | Guru mencatat setoran Tahfidz baru |
| `nilai` | Nilai Tadarus baru | Guru mencatat setoran Tadarus baru |
| `pkl` | Penempatan PKL baru | Siswa ditempatkan PKL baru |
| `pkl` | Nilai akhir PKL keluar | IDUKA mengirim penilaian akhir PKL |
| `pkl` | Jurnal PKL dikomentari | IDUKA mengisi catatan pada jurnal kegiatan PKL siswa |
| `ujian` | Ujian baru dijadwalkan | Ujian CBT (tipe "ujian") baru dibuat untuk kelasnya |
| `ujian` | Latihan baru dibuka | Latihan CBT (tipe "latihan") diterbitkan guru untuk kelasnya |
| `ujian` | Hasil ujian keluar | Guru mempublikasikan nilai ujian CBT |
| `ujian` | Sesi ujian direset | Guru/admin mereset sesi ujian yang sedang dikerjakan |
| `ujian` | Sesi ujian dihentikan | Guru/admin/pengawas menghentikan paksa sesi ujian yang sedang berjalan |
| `perpustakaan` | Buku berhasil dipinjam | Buku selesai diproses pinjam di meja sirkulasi |
| `perpustakaan` | Buku jatuh tempo besok | Peminjaman buku jatuh tempo besok (H-1) |
| `perpustakaan` | Buku terlambat dikembalikan | Peminjaman buku baru lewat jatuh tempo (H+1) |
| `jadwal` | Jadwal pelajaran diubah | Isian jadwal kelasnya dipindah jam atau dihapus |
| `pkl` | Penempatan PKL selesai | Penempatan PKL-nya ditandai selesai (satuan atau lewat "Tutup Semua Aktif") |
| `pengumuman` | Pengumuman baru | Guru membuat pengumuman baru (broadcast semua role) |

## Wali (Orang Tua)

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `prestasi` | Prestasi baru anak Anda | Anaknya dapat prestasi baru |
| `pelanggaran` | Pelanggaran anak Anda | Anaknya tercatat pelanggaran manual |
| `absensi` | Anak Anda alpa | Anaknya tercatat alpa |
| `sanksi` | Poin anak Anda menembus ambang sanksi | Poin pelanggaran anaknya menembus ambang Sanksi Bertingkat |
| `bk` | Kasus BK anak Anda | Anaknya dapat catatan BK baru |
| `bk` | Kasus BK anak Anda selesai | Kasus BK anaknya ditandai selesai |
| `spp` | Pembayaran SPP lunas / diterima (sebagian) | Pembayaran SPP anaknya tercatat |
| `tagihan_lain` | Pembayaran tagihan lunas / diterima (sebagian) | Pembayaran tagihan lain anaknya tercatat |
| `nilai` | Nilai baru anak Anda | Anaknya dapat nilai akademik baru |
| `nilai` | Nilai Tahsin/Tahfidz/Tadarus anak Anda | Anaknya dapat setoran Tahsin/Tahfidz/Tadarus baru |
| `pkl` | Penempatan PKL anak Anda | Anaknya ditempatkan PKL baru |
| `pkl` | Nilai akhir PKL anak Anda | Nilai akhir PKL anaknya keluar |
| `pkl` | Penempatan PKL anak Anda selesai | Penempatan PKL anaknya ditandai selesai |
| `pengumuman` | Pengumuman baru | Ada pengumuman baru (broadcast semua role) |

## Guru

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `pkl` | Ditugaskan sebagai pembimbing PKL | Ditugaskan jadi guru pembimbing penempatan PKL baru |
| `jadwal` | Jadwal mengajar diubah | Isian jadwal mengajarnya dipindah jam atau dihapus |
| `penugasan` | Tugas mengajar baru | Ditugaskan mengajar mapel+kelas baru (Tugas Mengajar) |
| `penugasan` | Tugas mengajar dilepas | Dilepas dari penugasan mengajar mapel+kelas (dihapus atau dipindah ke guru lain) |
| `perpustakaan` | Buku berhasil dipinjam / jatuh tempo besok / terlambat | Guru sendiri yang meminjam buku perpustakaan (peminjam bisa siswa ATAU guru) |
| `pengumuman` | Pengumuman baru | Ada pengumuman baru dari guru lain (broadcast semua role) |

## BK

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `bk` | Kejadian sanksi baru | Ada siswa yang menembus ambang poin Sanksi Bertingkat — perlu ditindaklanjuti |
| `pengumuman` | Pengumuman baru | Broadcast semua role |

## Kepala Bengkel (staf ruang)

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `maintenance` | Status pemeliharaan diperbarui | Laporan kerusakan di ruang tanggung jawabnya berubah status jadi "diproses"/"selesai" |
| `pengumuman` | Pengumuman baru | Broadcast semua role |

## Admin

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `backup` | Backup database dibuat | Admin lain membuat backup database (dikirim ke admin LAIN, bukan yang membuat) |
| `backup` | Backup database gagal | Percobaan backup database gagal |
| `backup` | Database diganti (impor) | Admin lain berhasil impor/restore database (menimpa total) |
| `backup` | Impor database gagal | Percobaan impor/restore database gagal di tengah proses |

## Semua Role Lain (waka_*, tu, teknisi, iduka, pustakawan, kepala_sekolah, pengawas_ujian, dst)

| Kategori | Judul | Kapan dikirim |
|---|---|---|
| `pengumuman` | Pengumuman baru | Guru membuat pengumuman baru — dikirim ke SEMUA user kecuali pembuatnya, masing-masing diarahkan ke portal role-nya sendiri |

---

## Catatan implementasi

- Semua notifikasi dikirim lewat titik masuk tunggal `App\Services\NotificationDispatcher` (`send()` untuk 1 penerima, `sendMany()` untuk banyak penerima kategori/pesan sama, `sendManyAcrossRoles()` khusus broadcast lintas role seperti pengumuman).
- Trigger dipasang langsung di controller/model pada titik terjadinya aksi (bukan polling), KECUALI pengingat jatuh tempo buku perpustakaan yang dijalankan lewat command terjadwal harian `perpustakaan:notif-jatuh-tempo` (lihat `routes/console.php`), karena sifatnya berbasis tanggal bukan aksi.
- Field `category` dipakai untuk pengelompokan/filter di masa depan, belum ada filter UI khusus per kategori di NotificationBell saat ini.
