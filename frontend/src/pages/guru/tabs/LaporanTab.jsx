import { useState } from 'react';
import AbsensiReportSection from './laporan/AbsensiReportSection';
import PoinReportSection from './laporan/PoinReportSection';
import PrestasiReportSection from './laporan/PrestasiReportSection';

const SECTIONS = [
  { key: 'absensi', label: 'Rekap Absensi', component: AbsensiReportSection },
  { key: 'poin', label: 'Rekap Poin Pelanggaran', component: PoinReportSection },
  { key: 'prestasi', label: 'Rekap Poin Prestasi', component: PrestasiReportSection },
];

export default function LaporanTab() {
  const [active, setActive] = useState('absensi');
  const section = SECTIONS.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="flex gap-1 bg-white rounded-xl border border-line-200 p-0.5 w-fit">
          {SECTIONS.map((s) => {
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
