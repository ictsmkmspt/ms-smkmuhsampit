import { useEffect, useMemo, useState } from 'react';
import { Monitor, BarChart3, FileQuestion, ClipboardEdit, CalendarRange, FileBarChart, BookOpen, Eye, ChevronDown, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import CbtProfilMenu from './CbtProfilMenu';
import MonitoringCbtTab from '../admin/kurikulum/MonitoringCbtTab';
import AdminBankSoalTab from '../admin/cbt/AdminBankSoalTab';
import AdminBuatUjianTab from '../admin/cbt/AdminBuatUjianTab';
import AdminJadwalTab from '../admin/cbt/AdminJadwalTab';
import AdminLaporanTab from '../admin/cbt/AdminLaporanTab';
import AdminMateriTab from '../admin/cbt/AdminMateriTab';
import PengawasUjianTab from '../admin/cbt/PengawasUjianTab';

// `scoped: true` = tab ini butuh 1 guru dipilih dulu (teacher_id eksplisit,
// lihat masing-masing komponen Admin*Tab) — guru yang dipilih disimpan di
// level portal ini (bukan per-tab) supaya tetap "nempel" begitu pindah
// antar tab Bank Soal/Buat Ujian/Jadwal/Laporan/Materi, persis alur guru
// asli pindah-pindah tab di CbtGuruPortal tanpa perlu pilih ulang.
const NAV = [
  { key: 'monitoring', label: 'Monitoring', icon: BarChart3, component: MonitoringCbtTab, scoped: false },
  { key: 'bank', label: 'Bank Soal', icon: FileQuestion, component: AdminBankSoalTab, scoped: true },
  { key: 'ujian', label: 'Buat Ujian', icon: ClipboardEdit, component: AdminBuatUjianTab, scoped: true },
  { key: 'jadwal', label: 'Jadwal', icon: CalendarRange, component: AdminJadwalTab, scoped: true },
  { key: 'laporan', label: 'Laporan', icon: FileBarChart, component: AdminLaporanTab, scoped: true },
  { key: 'materi', label: 'Materi', icon: BookOpen, component: AdminMateriTab, scoped: true },
  { key: 'pengawas', label: 'Pengawas Ujian', icon: Eye, component: PengawasUjianTab, scoped: false },
];

function GuruPicker({ teachers, selected, onPilih }) {
  const [open, setOpen] = useState(!selected);
  const [search, setSearch] = useState('');

  const filtered = teachers.filter((t) => t.user?.name?.toLowerCase().includes(search.toLowerCase()));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full surface-card p-3 mb-4 flex items-center justify-between gap-3 text-left hover:bg-mist-50 transition"
      >
        <div className="min-w-0">
          <p className="text-xs text-ink-500">Mengelola CBT milik</p>
          <p className="text-sm font-semibold text-ink-900 truncate">{selected.user?.name}</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-brand-600 shrink-0">Ganti Guru <ChevronDown className="w-3.5 h-3.5" /></span>
      </button>
    );
  }

  return (
    <div className="surface-card p-4 mb-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900 mb-3"><Users className="w-4 h-4 text-brand-600" /> Pilih Guru</p>
      <input
        placeholder="Cari nama guru..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="field-input w-full mb-3"
        autoFocus
      />
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => { onPilih(t); setOpen(false); setSearch(''); }}
            className={`w-full rounded-xl p-3 flex items-center justify-between gap-3 text-left transition ${
              selected?.id === t.id ? 'bg-brand-50 border border-brand-200' : 'border border-line-200 hover:bg-mist-50'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{t.user?.name}</p>
              <p className="text-xs text-ink-500">NIP {t.nip || '-'}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-ink-300 py-6">Tidak ada guru yang cocok.</p>
        )}
      </div>
    </div>
  );
}

// Portal Admin/Waka Kurikulum khusus CBT — SENGAJA dipisah dari
// AdminDashboard SIM Sekolah (login lewat /ujian/login, bukan /admin).
// Menu Bank Soal/Buat Ujian/Jadwal/Laporan/Materi langsung jadi item
// navbar sendiri-sendiri (bukan dibungkus 1 menu "Kelola CBT"), persis
// susunan CbtGuruPortal — akses penuh (lihat+ubah+tambah+hapus) untuk
// GURU yang dipilih lewat GuruPicker, disimpan di level portal ini supaya
// tidak perlu pilih ulang tiap pindah tab. Monitoring & Pengawas Ujian
// tidak butuh guru dipilih (lintas guru / berdiri sendiri).
export default function CbtAdminPortal() {
  const { user } = useAuth();
  const [active, setActive] = useState('monitoring');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    api.get('/teachers').then((res) => setTeachers(res.data));
  }, []);

  const navItem = useMemo(() => NAV.find((n) => n.key === active), [active]);
  const ActiveComponent = navItem?.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="cbt-scope min-h-screen bg-mist-50 flex flex-col md:flex-row pb-16 md:pb-0">
      <div className="md:hidden bg-[#0B1B3A] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-[#F2B705]" />
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wide">Portal CBT &middot; Admin</p>
            <p className="cbt-display text-sm font-semibold text-white">{user.name}</p>
          </div>
        </div>
        <CbtProfilMenu role={user.role} />
      </div>

      <aside className="hidden md:flex md:w-56 md:flex-col bg-[#0B1B3A] text-white p-4 shrink-0">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Monitor className="w-5 h-5 text-[#F2B705]" />
          <span className="cbt-display font-bold text-sm">Portal CBT</span>
        </div>
        <p className="text-[10px] uppercase tracking-wide text-white/35 font-semibold mb-2 px-2">Menu</p>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setActive(n.key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition ${
                active === n.key ? 'bg-brand-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <n.icon className="w-4 h-4 shrink-0" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold shrink-0">{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{user.name}</p>
            <p className="text-[10px] text-white/40">Admin CBT</p>
          </div>
          <CbtProfilMenu role={user.role} openUpward />
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-6 max-w-4xl mx-auto w-full">
        <h2 className="cbt-display text-lg font-bold text-ink-900 mb-4">{navItem?.label}</h2>

        {navItem?.scoped && (
          <GuruPicker teachers={teachers} selected={selectedTeacher} onPilih={setSelectedTeacher} />
        )}

        {navItem?.scoped && !selectedTeacher ? null : (
          ActiveComponent && <ActiveComponent teacherId={navItem?.scoped ? selectedTeacher?.id : undefined} />
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line-200 flex overflow-x-auto">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setActive(n.key)}
            className={`flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1 py-2.5 transition ${
              active === n.key ? 'text-brand-600' : 'text-ink-400'
            }`}
          >
            <n.icon className={`w-5 h-5 ${active === n.key ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className="text-[9px] font-medium leading-none text-center px-1">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
