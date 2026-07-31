import { useState } from 'react';
import BimbinganSiswaTab from './pkl/BimbinganSiswaTab';
import JurnalPembimbinganTab from './pkl/JurnalPembimbinganTab';
import PenilaianIdukaTab from './pkl/PenilaianIdukaTab';

const SECTIONS = [
  { key: 'siswa', label: 'Siswa Bimbingan', component: BimbinganSiswaTab },
  { key: 'pembimbingan', label: 'Jurnal Pembimbing', component: JurnalPembimbinganTab },
  { key: 'penilaian', label: 'Penilaian dari IDUKA', component: PenilaianIdukaTab },
];

export default function BimbinganPklTab() {
  const [active, setActive] = useState('siswa');
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
