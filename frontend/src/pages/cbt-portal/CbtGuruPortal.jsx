import { useState } from 'react';
import { Monitor, FileQuestion, ClipboardEdit, BarChart3, CalendarRange, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CbtProfilMenu from './CbtProfilMenu';
import NotificationBell from '../../components/NotificationBell';
import BankSoalSubTab from '../guru/tabs/cbt/BankSoalSubTab';
import BuatUjianSubTab from '../guru/tabs/cbt/BuatUjianSubTab';
import JadwalSubTab from '../guru/tabs/cbt/JadwalSubTab';
import LaporanSubTab from '../guru/tabs/cbt/LaporanSubTab';
import MateriSubTab from '../guru/tabs/cbt/MateriSubTab';

const NAV = [
  { key: 'bank', label: 'Bank Soal', icon: FileQuestion, component: BankSoalSubTab },
  { key: 'ujian', label: 'Buat Ujian', icon: ClipboardEdit, component: BuatUjianSubTab },
  { key: 'jadwal', label: 'Jadwal', icon: CalendarRange, component: JadwalSubTab },
  { key: 'laporan', label: 'Laporan', icon: BarChart3, component: LaporanSubTab },
  { key: 'materi', label: 'Materi', icon: BookOpen, component: MateriSubTab },
];

export default function CbtGuruPortal() {
  const { user } = useAuth();
  const [active, setActive] = useState('bank');

  const ActiveComponent = NAV.find((n) => n.key === active)?.component;
  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="cbt-scope min-h-screen bg-mist-50 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Header navy — cuma tampil di HP */}
      <div className="md:hidden bg-[#0B1B3A] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-[#F2B705]" />
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wide">Portal CBT &middot; Guru</p>
            <p className="cbt-display text-sm font-semibold text-white">{user.name}</p>
          </div>
        </div>
        <NotificationBell />
        <CbtProfilMenu role="guru" />
      </div>

      {/* Sidebar — cuma tampil di desktop */}
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
            <p className="text-[10px] text-white/40">Guru</p>
          </div>
          <NotificationBell />
          <CbtProfilMenu role="guru" openUpward />
        </div>
      </aside>

      {/* Konten */}
      <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-6 max-w-4xl mx-auto w-full">
        <h2 className="cbt-display text-lg font-bold text-ink-900 mb-4">{NAV.find((n) => n.key === active)?.label}</h2>
        {ActiveComponent && <ActiveComponent />}
      </main>

      {/* Tab bar rata — cuma tampil di HP, sengaja TIDAK memakai tombol
          melayang seperti dashboard SIM Sekolah supaya tidak tertukar
          visual dengan menu lain. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line-200 flex">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setActive(n.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition ${
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
