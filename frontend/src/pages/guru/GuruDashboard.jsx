import { useState } from 'react';
import { LogOut, ClipboardCheck, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AbsensiTab from './tabs/AbsensiTab';
import PoinPelanggaranTab from './tabs/PoinPelanggaranTab';
import LaporanTab from './tabs/LaporanTab';

const TABS = [
  { key: 'absensi', label: 'Absensi',          icon: ClipboardCheck, component: AbsensiTab },
  { key: 'poin',    label: 'Poin Pelanggaran',  icon: AlertTriangle,  component: PoinPelanggaranTab },
  { key: 'laporan', label: 'Laporan',           icon: FileText,       component: LaporanTab },
];

export default function GuruDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('absensi');

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-line-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-ink-500">Guru</p>
            <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-honey-700 font-medium">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      {/* Konten tab */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* Bottom navbar ala Instagram */}
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
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
