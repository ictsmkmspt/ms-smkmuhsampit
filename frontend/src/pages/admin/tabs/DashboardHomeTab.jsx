import { useEffect, useState } from 'react';
import { Users, GraduationCap, School, Building2, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, Briefcase, ClipboardCheck, BookOpen, DoorOpen, Package, CheckCircle2, XCircle, ClipboardList, Wrench, Database, Settings, UserPlus, HardHat } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import CategoryBarChart from '../../../components/CategoryBarChart';
import DailyGroupedBarChart from '../../../components/DailyGroupedBarChart';
import DateInput from '../../../components/DateInput';
import { MASTER_DATA_SUBMENU } from './MasterDataTab';
import { ALUMNI_SUBMENU } from './AlumniMenuTab';
import { POIN_SUBMENU } from './PoinTab';
import { LAPORAN_SUBMENU } from './LaporanTab';
import { PKL_SUBMENU } from './PklTab';
import { KURIKULUM_SUBMENU } from './KurikulumTab';
import { SARPRAS_SUBMENU } from './SarprasTab';
import { SETTINGS_SUBMENU } from './SettingsTab';
import { PPDB_SUBMENU } from './PpdbTab';

// Langkah pengaturan awal Waka Kesiswaan, berurutan sesuai ketergantungan
// datanya: Kelas harus ada dulu sebelum Siswa bisa dimasukkan, Siswa harus
// ada dulu sebelum Wali bisa dihubungkan, baru setelah itu poin/sanksi yang
// memang bergantung pada data pelanggaran siswa.
const PANDUAN_KESISWAAN = [
  { no: 1, judul: 'Input Kelas', keterangan: 'Buat daftar kelas. Untuk kenaikan kelas, tekan Edit dan ubah kelasnya.', tab: 'master', sub: 'kelas' },
  { no: 2, judul: 'Input Siswa', keterangan: 'Masukkan data siswa ke kelas yang sudah dibuat.', tab: 'master', sub: 'siswa' },
  { no: 3, judul: 'Input Wali Siswa', keterangan: 'Hubungkan akun wali (orang tua) ke masing-masing siswa.', tab: 'master', sub: 'wali' },
  { no: 4, judul: 'Atur Jenis Pelanggaran', keterangan: 'Tentukan jenis pelanggaran & poinnya sebelum mulai mencatat pelanggaran siswa.', tab: 'poin', sub: 'jenis-pelanggaran' },
  { no: 5, judul: 'Atur Jenis Prestasi', keterangan: 'Tentukan jenis prestasi & poinnya sebelum mulai mencatat prestasi siswa.', tab: 'poin', sub: 'jenis-prestasi' },
  { no: 6, judul: 'Sanksi Bertingkat', keterangan: 'Setelah poin berjalan, atur aturan sanksi berdasarkan akumulasi poin pelanggaran.', tab: 'poin', sub: 'sanksi' },
];

// Kartu "Panduan Awal" dipakai semua peran Waka — defaultnya terlipat
// (cuma judul + jumlah langkah) supaya tidak makan tempat di dashboard,
// terutama sekarang beberapa panduan sudah lumayan panjang (mis. Kurikulum
// 6 langkah). Klik judulnya untuk buka/tutup daftar langkah lengkap.
function PanduanAwal({ judul, deskripsi, langkah, onNavigate }) {
  const [buka, setBuka] = useState(false);
  return (
    <div className="surface-card border-l-4 border-l-brand-400 overflow-hidden">
      <button onClick={() => setBuka((v) => !v)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-ink-900">{judul}</h2>
          {!buka && <p className="text-xs text-ink-500 mt-0.5">{langkah.length} langkah pengaturan awal — klik untuk lihat detail.</p>}
        </div>
        <ChevronDown className={`w-4 h-4 text-ink-400 shrink-0 transition-transform ${buka ? 'rotate-180' : ''}`} />
      </button>
      {buka && (
        <div className="px-5 pb-5">
          <p className="text-sm text-ink-700 mb-4">{deskripsi}</p>
          <div className="space-y-2">
            {langkah.map((s) => (
              <div key={s.no} className="flex items-center gap-3 bg-mist-50 rounded-xl p-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center">{s.no}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900">{s.judul}</p>
                  <p className="text-xs text-ink-500">{s.keterangan}</p>
                </div>
                <button
                  onClick={() => onNavigate?.(s.tab, s.sub)}
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 bg-white border border-line-200 rounded-lg px-3 py-1.5 whitespace-nowrap"
                >
                  Buka <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Langkah pengaturan awal Waka Humas — cuma 1 langkah karena Penempatan PKL
// sekarang read-only buat Humas (yang mengisi Waka Kurikulum) dan menu
// Alumni cuma untuk tracking, bukan pengaturan awal.
const PANDUAN_HUMAS = [
  { no: 1, judul: 'Input Data IDUKA', keterangan: 'Daftarkan perusahaan/instansi tempat siswa PKL beserta akun login, instruktur, dan lokasi absensinya.', tab: 'pkl', sub: 'iduka' },
];

// Dashboard Waka Humas cuma menampilkan statistik PKL/IDUKA — bidangnya
// sendiri — bukan grafik pelanggaran/prestasi/absensi (itu bukan urusan
// Humas, dan backend-nya juga sudah tidak lagi mengizinkan Humas baca
// /dashboard/grafik).
function HumasDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ iduka: null, aktif: null, selesai: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/iduka').then((r) => r.data.length),
      api.get('/pkl-placements', { params: { status: 'aktif' } }).then((r) => r.data.length),
      api.get('/pkl-placements', { params: { status: 'selesai' } }).then((r) => r.data.length),
    ]).then(([iduka, aktif, selesai]) => {
      setStats({
        iduka: iduka.status === 'fulfilled' ? iduka.value : '!',
        aktif: aktif.status === 'fulfilled' ? aktif.value : '!',
        selesai: selesai.status === 'fulfilled' ? selesai.value : '!',
      });
      setLoading(false);
    });
  }, []);

  const KARTU = [
    { key: 'iduka', label: 'Total IDUKA', icon: Building2, color: '#3FB27F' },
    { key: 'aktif', label: 'PKL Aktif', icon: Briefcase, color: '#2a78d6' },
    { key: 'selesai', label: 'PKL Selesai', icon: ClipboardCheck, color: '#0B1B3A' },
  ];

  return (
    <div className="space-y-6">
      <PanduanAwal
        judul="Panduan Awal Humas"
        deskripsi="Data IDUKA perlu diisi lebih dulu sebelum Waka Kurikulum bisa membuat penempatan PKL siswa."
        langkah={PANDUAN_HUMAS}
        onNavigate={onNavigate}
      />

      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">Ringkasan</h2>
        <p className="text-sm text-ink-500 mt-1">Gambaran umum data PKL &amp; IDUKA saat ini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KARTU.map((k) => (
          <div key={k.key} className="surface-card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${k.color}1A` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <p className="font-display text-2xl font-bold text-ink-900">{loading ? '—' : stats[k.key]}</p>
            <p className="text-xs text-ink-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Langkah pengaturan awal Waka Kurikulum, berurutan sesuai ketergantungan
// datanya: hari libur harus ditentukan dulu sebelum kalender akademik
// disusun (supaya kegiatan tidak bentrok tanggal libur); mata pelajaran
// harus ada dulu sebelum bisa ditugaskan ke guru (Tugas Mengajar), dan
// Tugas Mengajar harus ada dulu sebelum bisa ditempatkan ke jam (Jadwal
// Pelajaran). Penempatan PKL siswa tidak bergantung ke langkah lain.
const PANDUAN_KURIKULUM = [
  { no: 1, judul: 'Atur Kalender Libur', keterangan: 'Tentukan tanggal libur (termasuk sabtu-minggu otomatis) sebelum menyusun kalender akademik.', tab: 'kurikulum', sub: 'libur' },
  { no: 2, judul: 'Atur Kalender Akademik', keterangan: 'Susun jadwal kegiatan (ASTS, ASAS, dll) sepanjang tahun ajaran.', tab: 'kurikulum', sub: 'akademik' },
  { no: 3, judul: 'Atur Penempatan PKL Siswa', keterangan: 'Tempatkan siswa ke IDUKA dan tentukan guru pembimbingnya.', tab: 'pkl', sub: 'penempatan' },
  { no: 4, judul: 'Input Mata Pelajaran', keterangan: 'Daftarkan mata pelajaran yang diajarkan, sebelum menetapkan Tugas Mengajar.', tab: 'kurikulum', sub: 'mapel' },
  { no: 5, judul: 'Atur Tugas Mengajar', keterangan: 'Tetapkan guru pengampu tiap mata pelajaran per kelas, sebelum menyusun jadwal.', tab: 'kurikulum', sub: 'tugas' },
  { no: 6, judul: 'Susun Jadwal Pelajaran', keterangan: 'Tempatkan Tugas Mengajar ke jam yang tersedia untuk membentuk jadwal lengkap.', tab: 'kurikulum', sub: 'jadwal' },
];

// Dashboard Waka Kurikulum — bidangnya sekarang Guru, Kalender Akademik/
// Libur, dan PKL (dibagi dengan Humas) — bukan grafik pelanggaran/prestasi/
// absensi (itu bukan urusan Kurikulum lagi, backend-nya juga sudah tidak
// mengizinkan Kurikulum baca /dashboard/grafik).
function KurikulumDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ guru: null, kelas: null, mapel: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/teachers').then((r) => r.data.length),
      api.get('/classes').then((r) => r.data.length),
      api.get('/subjects').then((r) => r.data.length),
    ]).then(([guru, kelas, mapel]) => {
      setStats({
        guru: guru.status === 'fulfilled' ? guru.value : '!',
        kelas: kelas.status === 'fulfilled' ? kelas.value : '!',
        mapel: mapel.status === 'fulfilled' ? mapel.value : '!',
      });
      setLoading(false);
    });
  }, []);

  const KARTU = [
    { key: 'guru', label: 'Total Guru', icon: GraduationCap, color: '#15803D' },
    { key: 'kelas', label: 'Total Kelas', icon: School, color: '#F2B705' },
    { key: 'mapel', label: 'Jumlah Mata Pelajaran', icon: BookOpen, color: '#2a78d6' },
  ];

  return (
    <div className="space-y-6">
      <PanduanAwal
        judul="Panduan Awal Kurikulum"
        deskripsi="Urutkan pengaturan seperti berikut: kalender libur lebih dulu (supaya kalender akademik tidak bentrok tanggal libur), kalender akademik, penempatan PKL siswa, lalu mata pelajaran, tugas mengajar, dan terakhir jadwal pelajaran (masing-masing bergantung pada langkah sebelumnya)."
        langkah={PANDUAN_KURIKULUM}
        onNavigate={onNavigate}
      />

      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">Ringkasan</h2>
        <p className="text-sm text-ink-500 mt-1">Gambaran umum data kurikulum saat ini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KARTU.map((k) => (
          <div key={k.key} className="surface-card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${k.color}1A` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <p className="font-display text-2xl font-bold text-ink-900">{loading ? '—' : stats[k.key]}</p>
            <p className="text-xs text-ink-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Langkah pengaturan awal Waka Sarpras, berurutan sesuai ketergantungan
// datanya: Ruangan harus ada dulu sebelum Inventaris Aset bisa ditempatkan
// (aset opsional bisa dikaitkan ke ruang tertentu).
const PANDUAN_SARPRAS = [
  { no: 1, judul: 'Tambah Ruangan', keterangan: 'Daftarkan ruang, lab, dan bengkel yang ada di sekolah.', tab: 'sarpras', sub: 'ruang' },
  { no: 2, judul: 'Input Data Teknisi / Kepala Bengkel', keterangan: 'Buat akun Teknisi dan Kepala Bengkel (penanggung jawab ruangan) untuk bantu kelola inventaris & pemeliharaan.', tab: 'sarpras-staf' },
  { no: 3, judul: 'Tambah Inventaris', keterangan: 'Catat aset/barang inventaris, opsional dikaitkan ke ruangan yang sudah dibuat.', tab: 'sarpras', sub: 'aset' },
];

// Dashboard Waka Sarpras — bidangnya sekarang cuma Sarana & Prasarana
// (Ruang/Lab dan Inventaris Aset) — bukan grafik pelanggaran/prestasi/
// absensi (itu bukan urusan Sarpras lagi, backend-nya juga sudah tidak
// mengizinkan Sarpras baca /dashboard/grafik).
function SarprasDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ ruang: null, aset: null, baik: null, rusak_ringan: null, rusak_berat: null, dilaporkan: null, diproses: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/rooms').then((r) => r.data.length),
      api.get('/assets').then((r) => r.data),
      api.get('/maintenance-requests').then((r) => r.data),
    ]).then(([ruang, aset, laporan]) => {
      const daftarAset = aset.status === 'fulfilled' ? aset.value : [];
      const daftarLaporan = laporan.status === 'fulfilled' ? laporan.value : [];
      const jumlahkan = (kunci) => daftarAset.reduce((total, a) => total + (a[kunci] || 0), 0);
      setStats({
        ruang: ruang.status === 'fulfilled' ? ruang.value : '!',
        aset: aset.status === 'fulfilled' ? jumlahkan('jumlah') : '!',
        baik: aset.status === 'fulfilled' ? jumlahkan('jumlah_baik') : '!',
        rusak_ringan: aset.status === 'fulfilled' ? jumlahkan('jumlah_rusak_ringan') : '!',
        rusak_berat: aset.status === 'fulfilled' ? jumlahkan('jumlah_rusak_berat') : '!',
        dilaporkan: laporan.status === 'fulfilled' ? daftarLaporan.filter((l) => l.status === 'dilaporkan').length : '!',
        diproses: laporan.status === 'fulfilled' ? daftarLaporan.filter((l) => l.status === 'diproses').length : '!',
      });
      setLoading(false);
    });
  }, []);

  const KARTU = [
    { key: 'ruang', label: 'Total Prasarana', icon: DoorOpen, color: '#2a78d6' },
    { key: 'aset', label: 'Total Inventaris Aset', icon: Package, color: '#F2B705' },
    { key: 'baik', label: 'Barang Baik', icon: CheckCircle2, color: '#15803D' },
    { key: 'rusak_ringan', label: 'Rusak Ringan', icon: AlertTriangle, color: '#D9A52A' },
    { key: 'rusak_berat', label: 'Rusak Berat', icon: XCircle, color: '#B9504F' },
    { key: 'dilaporkan', label: 'Barang Dilaporkan', icon: ClipboardList, color: '#6B7280' },
    { key: 'diproses', label: 'Barang Diproses', icon: Wrench, color: '#2a78d6' },
  ];

  return (
    <div className="space-y-6">
      <PanduanAwal
        judul="Panduan Awal Sarpras"
        deskripsi="Urutkan pengaturan seperti berikut: ruangan lebih dulu, baru inventaris aset (bisa dikaitkan ke ruangan yang sudah dibuat)."
        langkah={PANDUAN_SARPRAS}
        onNavigate={onNavigate}
      />

      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">Ringkasan</h2>
        <p className="text-sm text-ink-500 mt-1">Gambaran umum data sarana &amp; prasarana saat ini.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KARTU.map((k) => (
          <div key={k.key} className="surface-card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${k.color}1A` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <p className="font-display text-2xl font-bold text-ink-900">{loading ? '—' : stats[k.key]}</p>
            <p className="text-xs text-ink-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Palet kategorikal tetap (urutan tidak berubah walau data difilter) untuk
// memberi warna pada tipe pelanggaran/prestasi apa pun yang terdaftar admin.
// "Lainnya" (tipe di luar cap backend) selalu abu-abu netral, bukan hue.
const WARNA_KATEGORIKAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const WARNA_LAINNYA = '#6E8094';

function warnaiKategoriTipe(daftar) {
  let idx = 0;
  return (daftar || []).map((c) => {
    if (c.name === 'Lainnya') return { name: c.name, value: c.jumlah, color: WARNA_LAINNYA };
    const color = WARNA_KATEGORIKAL[idx % WARNA_KATEGORIKAL.length];
    idx += 1;
    return { name: c.name, value: c.jumlah, color };
  });
}

function hariIniIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Geser tanggal (string YYYY-MM-DD) sebanyak `delta` hari, dihitung lewat
// komponen tanggal lokal (bukan Date/UTC langsung) supaya tidak meleset
// sehari akibat konversi zona waktu.
function geserTanggal(tanggalIso, delta) {
  const [y, m, d] = tanggalIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatTanggalIndo(tanggalIso) {
  const [y, m, d] = tanggalIso.split('-').map(Number);
  return `${d} ${NAMA_BULAN[m - 1]} ${y}`;
}

const STAT_DEFS = [
  { key: 'siswa', label: 'Total Siswa', icon: Users, color: '#0B1B3A' },
  { key: 'guru', label: 'Total Guru', icon: GraduationCap, color: '#15803D' },
  { key: 'kelas', label: 'Total Kelas', icon: School, color: '#F2B705' },
  { key: 'iduka', label: 'Total IDUKA', icon: Building2, color: '#3FB27F' },
];

// "Pembelajaran" punya 1 grup bertingkat ("Kalender" -> Akademik/Libur) di
// sidebar — diratakan jadi daftar datar di sini, supaya dropdown di kartu
// dashboard tidak perlu 2 tingkat nested cuma untuk 1 grup.
const KURIKULUM_SUBMENU_DATAR = KURIKULUM_SUBMENU.flatMap((item) =>
  item.children ? item.children.map((c) => ({ key: c.key, label: c.label })) : [{ key: item.key, label: item.label }]
);

// "Laporan" juga punya 1 grup bertingkat ("PKL" -> Kegiatan Siswa/Monitoring
// Guru) — diratakan dengan pola yang sama. Grup tanpa diratakan tidak bisa
// dinavigasi langsung (tidak punya komponen sendiri), makanya WAJIB diratakan
// di sini, bukan dikirim mentah ke MENU_UTAMA.
const LAPORAN_SUBMENU_DATAR = LAPORAN_SUBMENU.flatMap((item) =>
  item.children ? item.children.map((c) => ({ key: c.key, label: c.label })) : [{ key: item.key, label: item.label }]
);

// Akses cepat ke semua menu utama — cuma buat Super Admin (role lain sudah
// punya dashboard ringkas sendiri di atas, dan sebagian besar menu di sini
// memang di luar bidangnya). `key` mengikuti TABS di AdminDashboard.jsx.
// `submenu` (kalau ada) dikirim ke onNavigate sebagai sub — kartu tanpa
// `submenu` langsung navigasi saat diklik, kartu yang punya `submenu`
// klik pertama cuma buka/tutup daftarnya (sama seperti dropdown di sidebar).
const MENU_UTAMA = [
  { key: 'master', label: 'Master Data', desc: 'Siswa, guru, kelas & wali', icon: Database, color: '#0B1B3A', submenu: MASTER_DATA_SUBMENU },
  { key: 'alumni', label: 'Alumni', desc: 'Data siswa yang sudah lulus', icon: GraduationCap, color: '#3FB27F', submenu: ALUMNI_SUBMENU },
  { key: 'poin', label: 'Poin', desc: 'Jenis poin & sanksi bertingkat', icon: ClipboardList, color: '#B9504F', submenu: POIN_SUBMENU },
  { key: 'pkl', label: 'PKL', desc: 'IDUKA & penempatan siswa', icon: Briefcase, color: '#15803D', submenu: PKL_SUBMENU },
  { key: 'kurikulum', label: 'Pembelajaran', desc: 'Kalender, mapel & jadwal', icon: BookOpen, color: '#eb6834', submenu: KURIKULUM_SUBMENU_DATAR },
  { key: 'ppdb', label: 'PPDB', desc: 'Formulir & pengaturan pendaftaran online', icon: UserPlus, color: '#0F766E', submenu: PPDB_SUBMENU },
  { key: 'sarpras-staf', label: 'Teknisi & Kepala Bengkel', desc: 'Penanggung jawab ruang', icon: HardHat, color: '#6B7280' },
  { key: 'sarpras', label: 'Sarana & Prasarana', desc: 'Ruang, aset & pemeliharaan', icon: Wrench, color: '#F2B705', submenu: SARPRAS_SUBMENU },
  { key: 'laporan', label: 'Laporan', desc: 'Absensi, poin, BK & nilai', icon: ClipboardCheck, color: '#2a78d6', submenu: LAPORAN_SUBMENU_DATAR },
  { key: 'pengaturan', label: 'Pengaturan', desc: 'Profil sekolah & cadangan data', icon: Settings, color: '#7C5CBF', submenu: SETTINGS_SUBMENU },
];

function MenuUtama({ onNavigate }) {
  const [openKey, setOpenKey] = useState(null);

  const handleCardClick = (m) => {
    if (m.submenu) {
      setOpenKey((prev) => (prev === m.key ? null : m.key));
    } else {
      onNavigate?.(m.key);
    }
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink-900">Menu Utama</h2>
      <p className="text-sm text-ink-500 mt-1 mb-4">Akses cepat ke semua menu pengelolaan sekolah.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MENU_UTAMA.map((m) => {
          const Icon = m.icon;
          const isOpen = openKey === m.key;
          return (
            // relative + dropdown `absolute` supaya kartu yang lagi dibuka
            // tidak jadi lebih tinggi dari kartu lain (ukuran semua kartu
            // tetap sama persis, dropdown-nya melayang di atas konten bawah).
            <div key={m.key} className="relative">
              <button
                onClick={() => handleCardClick(m)}
                className={`surface-card w-full h-32 p-4 text-left flex flex-col hover:shadow-md transition ${isOpen ? 'border-brand-300 shadow-md' : ''}`}
              >
                <div className="flex items-start justify-between gap-1 mb-auto">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${m.color}1A` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: m.color }} />
                  </div>
                  {m.submenu && (
                    <ChevronDown className={`w-4 h-4 text-ink-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900 leading-snug line-clamp-1">{m.label}</p>
                  <p className="text-xs text-ink-500 mt-0.5 leading-snug line-clamp-2">{m.desc}</p>
                </div>
              </button>
              {m.submenu && isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 surface-card bg-white py-1.5 shadow-lg">
                  {m.submenu.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onNavigate?.(m.key, s.key)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-ink-700 hover:text-brand-700 hover:bg-mist-50 text-left transition"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardHomeTab({ onNavigate }) {
  const { user } = useAuth();
  // "Total IDUKA" cuma relevan (dan cuma bisa diakses) buat admin/Waka Humas
  // — role Waka lain tidak punya izin baca /iduka, jadi statistik ini
  // disaring di sini supaya tidak muncul error gagal-ambil-data tiap kali
  // mereka buka Dashboard.
  const statDefs = STAT_DEFS
    .filter((s) => s.key !== 'iduka' || user.role === 'admin' || user.role === 'waka_humas')
    .filter((s) => s.key !== 'guru' || user.role !== 'waka_kesiswaan');

  const [stats, setStats] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const sekarang = new Date();
  const [tanggalGrafik, setTanggalGrafik] = useState(hariIniIso());
  const [bulanAbsensi, setBulanAbsensi] = useState(sekarang.getMonth() + 1);
  const [tahunAbsensi, setTahunAbsensi] = useState(sekarang.getFullYear());
  const [kelasGrafik, setKelasGrafik] = useState('');
  const [kelasList, setKelasList] = useState([]);
  const [grafik, setGrafik] = useState(null);
  const [loadingGrafik, setLoadingGrafik] = useState(true);

  useEffect(() => {
    // Waka Humas/Kurikulum/Sarpras punya dashboard sendiri (lihat di bawah)
    // yang tidak pernah merender dropdown filter kelas ini — dan Sarpras
    // sekarang malah sudah tidak lagi punya akses baca /classes sama sekali.
    // Super Admin juga dilewati — dashboard-nya sekarang cuma "Menu Utama",
    // Ringkasan/Grafik-nya sudah tidak ditampilkan lagi.
    if (user.role === 'admin' || user.role === 'waka_humas' || user.role === 'waka_kurikulum' || user.role === 'waka_sarpras') return;
    api.get('/classes').then((res) => setKelasList(res.data)).catch(() => setKelasList([]));
  }, [user.role]);

  useEffect(() => {
    // Waka Humas/Kurikulum/Sarpras tidak lagi punya akses /dashboard/grafik
    // (data pelanggaran/prestasi/absensi bukan tanggung jawabnya) —
    // dashboard-nya sendiri sudah diganti tampilan lain (lihat di bawah).
    // Super Admin juga dilewati — grafiknya sudah tidak ditampilkan lagi.
    if (user.role === 'admin' || user.role === 'waka_humas' || user.role === 'waka_kurikulum' || user.role === 'waka_sarpras') { setLoadingGrafik(false); return; }
    setLoadingGrafik(true);
    api.get('/dashboard/grafik', {
      params: {
        tanggal: tanggalGrafik,
        bulan: bulanAbsensi,
        tahun: tahunAbsensi,
        class_room_id: kelasGrafik || undefined,
      },
    })
      .then((res) => setGrafik(res.data))
      .catch(() => setGrafik(null))
      .finally(() => setLoadingGrafik(false));
  }, [tanggalGrafik, bulanAbsensi, tahunAbsensi, kelasGrafik, user.role]);

  function gantiBulanAbsensi(delta) {
    let b = bulanAbsensi + delta;
    let t = tahunAbsensi;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setBulanAbsensi(b);
    setTahunAbsensi(t);
  }

  useEffect(() => {
    // Waka Humas/Kurikulum/Sarpras punya dashboard sendiri dengan statistik
    // masing-masing (lihat HumasDashboard/KurikulumDashboard/SarprasDashboard
    // di atas) — Sarpras khususnya sudah tidak lagi punya akses baca
    // /students, /teachers, maupun /classes sama sekali. Super Admin juga
    // dilewati — dashboard-nya sekarang cuma "Menu Utama" navigasi.
    if (user.role === 'admin' || user.role === 'waka_humas' || user.role === 'waka_kurikulum' || user.role === 'waka_sarpras') {
      setLoading(false);
      return;
    }

    const sumber = {
      siswa: () => api.get('/students').then((r) => r.data.length),
      guru:  () => api.get('/teachers').then((r) => r.data.length),
      kelas: () => api.get('/classes').then((r) => r.data.length),
      ...(statDefs.some((s) => s.key === 'iduka') ? { iduka: () => api.get('/iduka').then((r) => r.data.length) } : {}),
    };

    const entries = Object.entries(sumber);

    Promise.allSettled(entries.map(([, fn]) => fn())).then((hasil) => {
      const nilai = {};
      const gagal = {};
      hasil.forEach((r, i) => {
        const key = entries[i][0];
        if (r.status === 'fulfilled') {
          nilai[key] = r.value;
        } else {
          gagal[key] = r.reason?.response?.data?.message || r.reason?.message || 'Gagal memuat.';
          console.error(`Dashboard: gagal ambil data "${key}"`, r.reason);
        }
      });
      setStats(nilai);
      setErrors(gagal);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- statDefs berubah identitas tiap render (hasil .filter()), tapi isinya stabil selama role user tidak berubah; sengaja cuma jalan sekali saat mount.

  const adaError = Object.keys(errors).length > 0;

  if (user.role === 'waka_humas') {
    return <HumasDashboard onNavigate={onNavigate} />;
  }
  if (user.role === 'waka_kurikulum') {
    return <KurikulumDashboard onNavigate={onNavigate} />;
  }
  if (user.role === 'waka_sarpras') {
    return <SarprasDashboard onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6">
      {user.role === 'waka_kesiswaan' && (
        <PanduanAwal
          judul="Panduan Awal Kesiswaan"
          deskripsi="Untuk data kesiswaan berjalan benar, urutkan pengaturan seperti berikut: kelas dan siswa lebih dulu (karena wali & poin bergantung pada data siswa), baru kemudian jenis pelanggaran/prestasi, dan terakhir aturan sanksi bertingkat (karena bergantung pada poin yang sudah tercatat)."
          langkah={PANDUAN_KESISWAAN}
          onNavigate={onNavigate}
        />
      )}

      {user.role === 'admin' && <MenuUtama onNavigate={onNavigate} />}

      {user.role !== 'admin' && (
        <>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900">Ringkasan</h2>
            <p className="text-sm text-ink-500 mt-1">Gambaran umum data sekolah saat ini.</p>
          </div>

          {adaError && (
            <div className="surface-card p-4 border-l-4 border-l-honey-400 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
              <div className="text-sm text-ink-700">
                <p className="font-medium mb-1">Sebagian data gagal dimuat:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {Object.entries(errors).map(([key, msg]) => (
                    <li key={key}>
                      <span className="font-medium">{statDefs.find((s) => s.key === key)?.label || key}</span>: {msg}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statDefs.map((s) => {
              const Icon = s.icon;
              const gagalAmbil = errors[s.key] !== undefined;
              const value = loading ? '—' : gagalAmbil ? '!' : (stats[s.key] ?? 0);
              return (
                <div key={s.key} className="surface-card p-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${s.color}1A` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
                  <p className="text-xs text-ink-500 mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-semibold text-ink-900">Grafik</h2>
            <div className="flex items-center gap-2">
              <select
                value={kelasGrafik}
                onChange={(e) => setKelasGrafik(e.target.value)}
                className="field-input text-sm text-ink-700 py-1.5"
              >
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 bg-white border border-line-200 rounded-xl px-1 py-1">
                <button onClick={() => setTanggalGrafik((t) => geserTanggal(t, -1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Hari sebelumnya">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <DateInput
                  value={tanggalGrafik}
                  onChange={(e) => e.target.value && setTanggalGrafik(e.target.value)}
                  className="text-sm font-medium text-ink-900 px-2 text-center bg-transparent border-none focus:outline-none"
                />
                <button onClick={() => setTanggalGrafik((t) => geserTanggal(t, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Hari berikutnya">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {loadingGrafik ? (
            <p className="text-center text-ink-300 py-6">Memuat grafik...</p>
          ) : !grafik ? (
            <p className="text-center text-ink-300 py-6">Gagal memuat data grafik.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CategoryBarChart
                  title="Pelanggaran"
                  subtitle={`Komposisi jenis pelanggaran, ${formatTanggalIndo(tanggalGrafik)}`}
                  showTableToggle
                  categories={warnaiKategoriTipe(grafik.pelanggaran)}
                />
                <CategoryBarChart
                  title="Prestasi"
                  subtitle={`Komposisi jenis prestasi, ${formatTanggalIndo(tanggalGrafik)}`}
                  showTableToggle
                  categories={warnaiKategoriTipe(grafik.prestasi)}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-1 bg-white border border-line-200 rounded-xl px-1 py-1">
                  <button onClick={() => gantiBulanAbsensi(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan sebelumnya">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-ink-900 px-2 min-w-[8rem] text-center">{NAMA_BULAN[bulanAbsensi - 1]} {tahunAbsensi}</span>
                  <button onClick={() => gantiBulanAbsensi(1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan berikutnya">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <DailyGroupedBarChart
                title="Absensi Bulanan"
                subtitle={`Komposisi kehadiran siswa per tanggal, ${NAMA_BULAN[grafik.bulan - 1]} ${grafik.tahun}`}
                showTableToggle
                labels={grafik.absensi.hadir.map((_, i) => i + 1)}
                series={[
                  { name: 'Hadir', color: '#15803D', data: grafik.absensi.hadir },
                  { name: 'Izin', color: '#2a78d6', data: grafik.absensi.izin },
                  { name: 'Sakit', color: '#D9A52A', data: grafik.absensi.sakit },
                  { name: 'Alpa', color: '#B9504F', data: grafik.absensi.alpa },
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
