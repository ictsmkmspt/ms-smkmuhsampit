# Cara Menjalankan Website Absensi Barcode di Localhost

Paket ini berisi 2 folder:
- `backend/` → aplikasi Laravel (API)
- `frontend/` → aplikasi React + Tailwind (tampilan website)

> **Kompatibilitas:** sudah disesuaikan untuk **Ubuntu 26.04 LTS ("Resolute Raccoon")**, tetap kompatibel juga di Ubuntu 24.04 LTS, Windows, maupun macOS.

> **Penting:** folder `vendor/` (punya backend) dan `node_modules/` (punya frontend) **sengaja tidak disertakan** di paket ini — ini adalah praktik standar (file-nya sangat besar & otomatis bisa diunduh ulang). Kamu cukup jalankan 1 perintah di tiap folder untuk mengunduhnya, dijelaskan di bawah. **Wajib terhubung internet** saat langkah ini saja.

---

## Yang harus sudah terinstall di laptop/PC kamu

Cek dulu dengan perintah ini di Terminal (Mac/Linux) atau CMD/PowerShell (Windows):
```bash
php -v        # harus PHP 8.3 atau lebih baru
composer -V   # composer terinstall
node -v       # versi 20 atau lebih baru
npm -v
```
Kalau belum ada salah satu, install dulu:
- **Di Ubuntu 26.04 LTS**: PHP sudah otomatis tersedia versi 8.5 dari repo bawaan (sudah lebih dari cukup, Laravel cukup butuh PHP 8.3+) — cukup `sudo apt install -y php php-cli php-mbstring php-xml php-curl php-zip php-bcmath php-gd php-sqlite3 php-intl unzip composer`. **Tidak perlu** menambah PPA pihak ketiga lagi.
- **Di Windows**: termudah pakai [Laragon](https://laragon.org/) atau [Herd](https://herd.laravel.com/) — sudah sepaket PHP, Composer, dan database.
- **Node.js**: unduh di [nodejs.org](https://nodejs.org/) (pilih versi LTS), atau di Ubuntu lewat `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -` lalu `sudo apt install -y nodejs`.

---

## Langkah 1 — Jalankan Backend (Laravel)

Buka terminal, masuk ke folder `backend`:
```bash
cd backend
composer install
```
Tunggu sampai selesai (ini yang butuh internet, mengunduh "mesin" Laravel).

File `.env` **sudah disiapkan** dan sudah diatur pakai database **SQLite** (paling simpel untuk localhost — tidak perlu install MySQL sama sekali). Lanjutkan:
```bash
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
Kalau berhasil, muncul tulisan kira-kira:
```
INFO  Server running on [http://127.0.0.1:8000].
```
**Biarkan terminal ini tetap terbuka** (jangan ditutup) — ini adalah server backend yang harus terus berjalan.

✅ Backend sudah hidup di `http://127.0.0.1:8000`
✅ Sudah otomatis ada 1 akun admin: **email** `admin@sekolah.com` / **password** `admin123`

---

## Langkah 2 — Jalankan Frontend (React)

Buka **terminal baru** (jangan tutup terminal backend), masuk ke folder `frontend`:
```bash
cd frontend
npm install
npm run dev
```
Kalau berhasil, muncul tulisan kira-kira:
```
Local:   http://localhost:5173/
```
**Biarkan terminal ini juga tetap terbuka.**

---

## Langkah 3 — Buka di Browser

Buka browser, akses:
```
http://localhost:5173
```
Login dengan akun admin di atas. Setelah berhasil masuk, kamu otomatis diarahkan ke dashboard admin.

> Untuk coba fitur **scan barcode pakai kamera** (halaman Guru), browser akan minta izin akses kamera — klik **Allow/Izinkan**. Di `localhost`, kamera tetap bisa diakses meski tanpa HTTPS (ini pengecualian khusus browser untuk alamat localhost).

---

## Cara Membuat Akun Guru & Siswa Uji Coba

Setelah login sebagai admin, tambahkan siswa lewat form di dashboard admin. Setiap siswa baru otomatis dapat `barcode_code` unik (terlihat di kolom "Barcode" pada tabel).

Untuk membuat akun **guru**, sementara ini paling cepat lewat Tinker (nanti bisa dibuatkan form khususnya juga):
```bash
cd backend
php artisan tinker
```
Lalu di dalam Tinker, ketik:
```php
App\Models\Teacher::create([
    'user_id' => App\Models\User::create([
        'name' => 'Bu Siti',
        'email' => 'guru@sekolah.com',
        'password' => bcrypt('guru123'),
        'role' => 'guru',
    ])->id,
    'nip' => '198501012010',
]);
```
Ketik `exit` untuk keluar dari Tinker.

---

## Mengetes Scan Barcode Tanpa Kamera Fisik

Kalau belum sempat cetak barcode fisik, kamu bisa lihat dulu kode barcode siswa (kolom "Barcode" di tabel admin, contoh: `STD-AB12CD34`), lalu coba lewat terminal:
```bash
curl -X POST http://127.0.0.1:8000/api/attendance/scan \
  -H "Authorization: Bearer TOKEN_GURU_ATAU_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"code":"STD-AB12CD34"}'
```
(`TOKEN_...` didapat dari response saat login lewat endpoint `/api/login`.) Untuk uji coba sehari-hari, cara termudah tetap lewat halaman web — arahkan kode barcode di layar HP/laptop lain ke kamera, atau cetak barcode-nya dari halaman siswa (bagian "Barcode Absensi Kamu") lalu scan dari layar/print itu.

---

## Kalau Ada Error

| Masalah | Solusi |
|---|---|
| `composer install` gagal / timeout | Cek koneksi internet, coba lagi |
| `add-apt-repository: command not found` atau PPA `ondrej/php` gagal ditambahkan di Ubuntu 26.04 | Tidak masalah — **lewati saja** langkah PPA itu, Ubuntu 26.04 sudah punya PHP 8.5 langsung dari repo bawaan, cukup `sudo apt install php php-cli ...` |
| `npm install` error `EACCES` | Jangan jalankan pakai `sudo`, pastikan folder bukan milik root |
| Login gagal "Network Error" di browser | Pastikan terminal backend (`php artisan serve`) masih berjalan |
| Kamera tidak muncul | Pastikan akses lewat `http://localhost:5173`, bukan IP seperti `192.168.x.x` (kamera browser butuh `localhost` atau HTTPS) |
| `SQLSTATE` error saat migrate | Hapus file `backend/database/database.sqlite`, buat ulang file kosong, lalu `php artisan migrate --seed` lagi |

---

## Setelah Lancar di Localhost

Kalau sudah lancar dites di laptop, untuk pindah ke server Ubuntu 26.04 LTS (online, bisa diakses publik), ikuti panduan lengkap terpisah: **panduan-absensi-barcode.md** (bagian 13: Build & Deploy ke Server). Satu-satunya perbedaan untuk Ubuntu 26.04: langkah install PHP cukup `sudo apt install -y php php-fpm ...` (tanpa PPA `ondrej/php`), karena PHP 8.5 sudah tersedia langsung dari repo resmi.
