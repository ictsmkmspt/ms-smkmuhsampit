import { useState } from 'react';
import { LogOut, BookMarked, Home, ScanLine, UserCheck, Library, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BerandaTab from './tabs/BerandaTab';
import SirkulasiTab from './tabs/SirkulasiTab';
import KunjunganTab from './tabs/KunjunganTab';
import KatalogTab from './tabs/KatalogTab';
import PengaturanTab from './tabs/PengaturanTab';

const TABS = [
  { key: 'beranda', label: 'Beranda', icon: Home, component: BerandaTab },
  { key: 'sirkulasi', label: 'Sirkulasi', icon: ScanLine, component: SirkulasiTab },
  { key: 'kunjungan', label: 'Kunjungan', icon: UserCheck, component: KunjunganTab },
  { key: 'katalog', label: 'Katalog', icon: Library, component: KatalogTab },
  { key: 'pengaturan', label: 'Pengaturan', icon: Settings, component: PengaturanTab },
];

export default function PerpustakaanStaffDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('beranda');

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60">Pengurus Perpustakaan</p>
              <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
            </div>
          </div>

          <button onClick={logout} className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#F2B705] transition">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {ActiveComponent && <ActiveComponent />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
                  isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-brand-600' : 'text-ink-400'}`}>
                  {tab.label}
                </span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
