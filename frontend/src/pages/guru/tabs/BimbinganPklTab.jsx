import { useState } from 'react';
import { Users, NotebookPen, Star } from 'lucide-react';
import BimbinganSiswaTab from './pkl/BimbinganSiswaTab';
import JurnalPembimbinganTab from './pkl/JurnalPembimbinganTab';
import PenilaianIdukaTab from './pkl/PenilaianIdukaTab';

// Gaya sub-menu sama seperti sub-menu Ortu (pill putih rata tengah, ikon +
// label ringkas) — label dipersingkat: Siswa, Jurnal, Nilai.
const SECTIONS = [
  { key: 'siswa', label: 'Siswa', icon: Users, component: BimbinganSiswaTab },
  { key: 'pembimbingan', label: 'Jurnal', icon: NotebookPen, component: JurnalPembimbinganTab },
  { key: 'penilaian', label: 'Nilai', icon: Star, component: PenilaianIdukaTab },
];

export default function BimbinganPklTab() {
  const [active, setActive] = useState('siswa');
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
