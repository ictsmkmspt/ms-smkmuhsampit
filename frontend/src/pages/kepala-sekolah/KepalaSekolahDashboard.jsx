import { useEffect, useState } from 'react';
import {
  LogOut, Pencil, Menu, X, Users, Briefcase, BookOpen, Wallet, UserCog, ClipboardList, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import EditProfileModal from '../../components/EditProfileModal';
import NotificationBell from '../../components/NotificationBell';
import api from '../../api/axios';

const fmtRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

function StatCard({ label, value, sub, tone = 'ink' }) {
  const toneClass = {
    ink: 'text-ink-900',
    brand: 'text-brand-700',
    honey: 'text-honey-700',
    rose: 'text-rose-700',
  }[tone];

  return (
    <div className="rounded-xl border border-line-200 bg-mist-50/60 px-4 py-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`font-display text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-brand-500" />
        <h2 className="font-display font-semibold text-ink-900">{title}</h2>
      </div>
      {desc && <p className="text-xs text-ink-500 mb-4">{desc}</p>}
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${desc ? '' : 'mt-4'}`}>{children}</div>
    </div>
  );
}

// Dashboard ringkasan lintas modul untuk Kepala Sekolah — READ ONLY (tidak
// ada tombol tambah/ubah/hapus sama sekali di halaman ini, cuma satu
// halaman berisi angka-angka penting tiap bidang), sengaja tanpa sidebar
// tab seperti dashboard role lain karena memang cuma 1 halaman.
export default function KepalaSekolahDashboard() {
  const { user, logout } = useAuth();
  const { profile } = useSchoolProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/kepala-sekolah/ringkasan')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat ringkasan.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-mist-50">
      {/* ===== Navbar atas ===== */}
      <div className="bg-[#0B1B3A] sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 md:px-8 py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo Sekolah" className="w-8 h-8 rounded-full object-contain bg-white shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F2B705] to-[#15803D] flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-[#0B1B3A] text-[10px]">SM</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-bold text-white text-xs truncate">{profile.nama_sekolah?.toUpperCase()}</p>
              <p className="text-[10px] text-white/50">Dashboard Kepala Sekolah</p>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <NotificationBell />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-display font-semibold text-xs shrink-0">
                {initial}
              </div>
              <p className="text-sm text-white truncate">{user.name}</p>
            </div>
            <button onClick={() => setShowEditProfil(true)} title="Edit Profil" className="text-white/60 hover:text-[#F2B705] transition">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={logout} title="Keluar" className="text-white/60 hover:text-[#F2B705] transition">
              <LogOut className="w-4 h-4" />
            </button>
            <NotificationBell />
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-1">
            <button
              onClick={() => { setShowEditProfil(true); setMobileOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
            >
              <Pencil className="w-4 h-4" /> Edit Profil
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-[#F2B705] transition"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        )}
      </div>

      {/* ===== Konten ===== */}
      <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-900">Ringkasan Sekolah</h1>
            <p className="text-xs text-ink-500 mt-0.5">Gambaran umum semua bidang, hari ini {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          </div>
          <button
            onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-3 py-2 disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Memuat...' : 'Segarkan'}
          </button>
        </div>

        {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}

        {!data && !error ? (
          <p className="text-center text-ink-300 py-16 text-sm">Memuat ringkasan...</p>
        ) : data && (
          <>
            <Section icon={Users} title="Kesiswaan" desc="Kondisi siswa & kehadiran hari ini.">
              <StatCard label="Siswa Aktif" value={data.kesiswaan.total_siswa_aktif} />
              <StatCard label="Alumni (Lulus)" value={data.kesiswaan.total_siswa_lulus} />
              <StatCard
                label="Kehadiran Hari Ini"
                value={data.kesiswaan.kehadiran_hari_ini.persen != null ? `${data.kesiswaan.kehadiran_hari_ini.persen}%` : '—'}
                sub={data.kesiswaan.kehadiran_hari_ini.tercatat > 0 ? `${data.kesiswaan.kehadiran_hari_ini.hadir}/${data.kesiswaan.kehadiran_hari_ini.tercatat} tercatat` : 'Belum ada absensi tercatat'}
                tone="brand"
              />
              <StatCard label="Pelanggaran Bulan Ini" value={data.kesiswaan.pelanggaran_bulan_ini} tone="honey" />
              <StatCard label="Prestasi Bulan Ini" value={data.kesiswaan.prestasi_bulan_ini} tone="brand" />
            </Section>

            <Section icon={Briefcase} title="PKL (Praktik Kerja Lapangan)">
              <StatCard label="Penempatan Aktif" value={data.pkl.total_penempatan_aktif} tone="brand" />
              <StatCard label="Penempatan Selesai" value={data.pkl.total_penempatan_selesai} />
            </Section>

            <Section icon={BookOpen} title="Perpustakaan">
              <StatCard label="Total Judul Buku" value={data.perpustakaan.total_judul} />
              <StatCard label="Total Eksemplar" value={data.perpustakaan.total_eksemplar} />
              <StatCard label="Sedang Dipinjam" value={data.perpustakaan.sedang_dipinjam} />
              <StatCard label="Terlambat Dikembalikan" value={data.perpustakaan.terlambat} tone={data.perpustakaan.terlambat > 0 ? 'honey' : 'ink'} />
              <StatCard label="Kunjungan Bulan Ini" value={data.perpustakaan.kunjungan_bulan_ini} />
            </Section>

            <Section icon={Wallet} title="Keuangan" desc="SPP & tagihan lain, bulan berjalan.">
              <StatCard label="Terkumpul Bulan Ini" value={fmtRupiah(data.keuangan.terkumpul_bulan_ini)} tone="brand" />
              <StatCard label="Total Tunggakan" value={fmtRupiah(data.keuangan.total_tunggakan)} tone={data.keuangan.total_tunggakan > 0 ? 'rose' : 'ink'} />
            </Section>

            <Section icon={UserCog} title="Kepegawaian">
              <StatCard label="Guru" value={data.kepegawaian.guru} />
              <StatCard label="Tata Usaha" value={data.kepegawaian.tu} />
              <StatCard label="Staf Lainnya" value={data.kepegawaian.staff_lain} sub="Waka, BK, Pustakawan, Bengkel" />
            </Section>

            <Section icon={ClipboardList} title="PPDB" desc="Pendaftar tahun ajaran berjalan.">
              <StatCard label="Total Pendaftar" value={data.ppdb.total} />
              <StatCard label="Sedang Verifikasi" value={data.ppdb.verifikasi} tone="honey" />
              <StatCard label="Diterima" value={data.ppdb.diterima} tone="brand" />
              <StatCard label="Ditolak" value={data.ppdb.ditolak} tone={data.ppdb.ditolak > 0 ? 'rose' : 'ink'} />
            </Section>
          </>
        )}
      </div>

      {showEditProfil && <EditProfileModal onClose={() => setShowEditProfil(false)} />}
    </div>
  );
}
