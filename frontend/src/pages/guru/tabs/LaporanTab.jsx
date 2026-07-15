import { useState } from 'react';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import AbsensiReportSection from './laporan/AbsensiReportSection';
import PoinReportSection from './laporan/PoinReportSection';

const SECTIONS = [
  { key: 'absensi', label: 'Rekap Absensi', icon: ClipboardList, component: AbsensiReportSection },
  { key: 'poin', label: 'Rekap Poin Pelanggaran', icon: AlertTriangle, component: PoinReportSection },
];

export default function LaporanTab() {
  const [active, setActive] = useState('absensi');
  const section = SECTIONS.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex gap-1 bg-white rounded-xl border border-line-200 p-1 w-fit mb-6">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
