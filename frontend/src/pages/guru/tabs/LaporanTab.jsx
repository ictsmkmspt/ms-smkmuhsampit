import { useState } from 'react';
import { ClipboardCheck, AlertTriangle, Trophy } from 'lucide-react';
import AbsensiReportSection from './laporan/AbsensiReportSection';
import PoinReportSection from './laporan/PoinReportSection';
import PrestasiReportSection from './laporan/PrestasiReportSection';

// Gaya sub-menu sama seperti sub-menu Ortu (pill putih rata tengah, ikon +
// label ringkas) — label dipersingkat: Absensi, Pelanggaran, Prestasi.
const SECTIONS = [
  { key: 'absensi', label: 'Absensi', icon: ClipboardCheck, component: AbsensiReportSection },
  { key: 'poin', label: 'Pelanggaran', icon: AlertTriangle, component: PoinReportSection },
  { key: 'prestasi', label: 'Prestasi', icon: Trophy, component: PrestasiReportSection },
];

export default function LaporanTab() {
  const [active, setActive] = useState('absensi');
  const section = SECTIONS.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit mx-auto">
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
