import { useState } from 'react';
import NilaiTab from './NilaiTab';
import TahsinSection from './penilaian/TahsinSection';
import TahfidzSection from './penilaian/TahfidzSection';
import TadarusSection from './penilaian/TadarusSection';

// Menu "Nilai" diganti "Penilaian" dengan sub-menu — Nilai Akademik (dikunci
// ke Tugas Mengajar guru, komponen lama dipakai apa adanya) dan 3 modul baru
// Tahsin/Tahfidz/Tadarus yang SEMUA guru boleh isi untuk kelas/siswa manapun.
const SECTIONS = [
  { key: 'akademik', label: 'Nilai Akademik', component: NilaiTab },
  { key: 'tahsin', label: 'Tahsin', component: TahsinSection },
  { key: 'tahfidz', label: 'Tahfidz', component: TahfidzSection },
  { key: 'tadarus', label: 'Tadarus', component: TadarusSection },
];

export default function PenilaianTab() {
  const [active, setActive] = useState('akademik');
  const section = SECTIONS.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit mx-auto overflow-x-auto max-w-full">
        {SECTIONS.map((s) => {
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
