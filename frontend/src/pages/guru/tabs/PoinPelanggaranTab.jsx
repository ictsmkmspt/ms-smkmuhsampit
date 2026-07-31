import { useState } from 'react';
import PoinPrestasiSection from './poin/PoinPrestasiSection';
import PoinPelanggaranSection from './poin/PoinPelanggaranSection';

const SECTIONS = [
  { key: 'prestasi',    label: 'Poin Prestasi',   component: PoinPrestasiSection },
  { key: 'pelanggaran', label: 'Poin Pelanggaran', component: PoinPelanggaranSection },
];

export default function PoinPelanggaranTab() {
  const [active, setActive] = useState('prestasi');
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
